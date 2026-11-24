-- ============================================================
-- Migracion 026: administracion completa de negocios
-- ------------------------------------------------------------
-- OBJETIVO: dar soporte de base de datos al CRUD administrativo:
--   * negocios creados por el ADMIN sin un vendedor propietario;
--   * "eliminar negocio" como ARCHIVADO transaccional y auditable;
--   * proteccion en BASE DE DATOS del campo de archivado.
--
-- POR QUE BORRADO LOGICO: 12 de las 13 FK hacia `businesses` son
-- ON DELETE CASCADE. Un DELETE fisico destruye tour_plans ->
-- tour_plan_salidas -> inscripciones (precios/pagos historicos) y
-- subscriptions -> suscripcion_pagos (bitacora financiera). El
-- archivado mantiene esas filas intactas y solo retira el negocio
-- de las consultas publicas.
--
-- NO DESTRUCTIVA E IDEMPOTENTE: solo ANADE columnas, funcion,
-- trigger e indice. No modifica migraciones anteriores.
-- ============================================================

BEGIN;

-- 1) Negocios de plataforma: el ADMIN puede crear sin vendedor ----------
-- owner_id pasa a nullable. `owner_id IS NULL` significa "propiedad de la
-- plataforma", no un usuario inventado. `creado_por_admin` deja constancia
-- del administrador que lo registro.
ALTER TABLE businesses ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS creado_por_admin INTEGER
  REFERENCES usuarios (id) ON DELETE SET NULL;

-- 2) Archivado administrativo -------------------------------------------
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eliminado_por INTEGER
  REFERENCES usuarios (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_eliminacion TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_archivo_coherente') THEN
    ALTER TABLE businesses
      ADD CONSTRAINT chk_businesses_archivo_coherente
      CHECK (
        (eliminado_at IS NULL AND eliminado_por IS NULL)
        OR (eliminado_at IS NOT NULL AND eliminado_por IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_businesses_archivo
  ON businesses (eliminado_at) WHERE eliminado_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_businesses_vigentes
  ON businesses (estado, publicacion_estado) WHERE eliminado_at IS NULL;

-- El ADMIN puede ocultar un negocio sin que el cron de suscripciones lo
-- vuelva a publicar: 'oculto_admin' NO es tocado por las renovaciones
-- (estas solo mueven 'oculto_suscripcion' -> 'visible').
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_businesses_publicacion_estado') THEN
    ALTER TABLE businesses DROP CONSTRAINT chk_businesses_publicacion_estado;
  END IF;
  ALTER TABLE businesses
    ADD CONSTRAINT chk_businesses_publicacion_estado
    CHECK (publicacion_estado IN ('visible', 'oculto_suscripcion', 'oculto_admin'));
END $$;

-- El historial de identidad admite tambien la restauracion y los cambios
-- de moderacion/publicacion hechos por el ADMIN.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_business_identity_audit_accion') THEN
    ALTER TABLE business_identity_audit DROP CONSTRAINT chk_business_identity_audit_accion;
  END IF;
  ALTER TABLE business_identity_audit
    ADD CONSTRAINT chk_business_identity_audit_accion
    CHECK (accion IN (
      'crear', 'renombrar', 'eliminar', 'restaurar',
      'cambiar_estado', 'publicar', 'ocultar',
      'duplicado_detectado', 'duplicado_autorizado',
      'intento_renombrar_rechazado', 'intento_eliminar_rechazado'
    ));
END $$;

-- 3) Proteccion en base de datos ---------------------------------------
-- Solo las funciones SECURITY DEFINER de abajo pueden tocar las columnas
-- de archivado: fijan `app.archivo_admin` dentro de la transaccion.
CREATE OR REPLACE FUNCTION fn_proteger_archivo_negocio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (
    NEW.eliminado_at IS DISTINCT FROM OLD.eliminado_at
    OR NEW.eliminado_por IS DISTINCT FROM OLD.eliminado_por
    OR NEW.motivo_eliminacion IS DISTINCT FROM OLD.motivo_eliminacion
  ) AND COALESCE(current_setting('app.archivo_admin', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Las columnas de archivado solo se modifican mediante la funcion administrativa'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_archivo_negocio ON businesses;
CREATE TRIGGER trg_proteger_archivo_negocio
  BEFORE UPDATE OF eliminado_at, eliminado_por, motivo_eliminacion
  ON businesses FOR EACH ROW EXECUTE FUNCTION fn_proteger_archivo_negocio();

-- 4) Funcion de archivado: comprueba el rol DENTRO de la BD -------------
CREATE OR REPLACE FUNCTION fn_archivar_negocio_admin(
  p_negocio_id INTEGER,
  p_actor_id INTEGER,
  p_motivo TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_negocio businesses%ROWTYPE;
  v_rol INTEGER;
  v_motivo TEXT;
BEGIN
  SELECT rol_id INTO v_rol FROM usuarios WHERE id = p_actor_id;
  IF v_rol IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Se requieren permisos de administrador'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_negocio FROM businesses WHERE id = p_negocio_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocio no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_negocio.eliminado_at IS NOT NULL THEN
    RAISE EXCEPTION 'El negocio ya esta archivado' USING ERRCODE = 'P0001';
  END IF;

  v_motivo := NULLIF(BTRIM(COALESCE(p_motivo, '')), '');
  PERFORM set_config('app.archivo_admin', 'on', true);

  UPDATE businesses
     SET eliminado_at = NOW(),
         eliminado_por = p_actor_id,
         motivo_eliminacion = v_motivo,
         updated_at = NOW()
   WHERE id = p_negocio_id;

  INSERT INTO business_identity_audit
    (business_id, owner_id, actor_id, actor_rol, accion, nombre_anterior, motivo, permitido)
  VALUES
    (p_negocio_id, v_negocio.owner_id, p_actor_id, 'ADMIN', 'eliminar',
     v_negocio.nombre,
     COALESCE(v_motivo, 'Archivado por ADMIN: borrado logico, historial conservado'),
     true);

  RETURN jsonb_build_object(
    'id', p_negocio_id,
    'nombre', v_negocio.nombre,
    'eliminado_at', NOW()
  );
END;
$$;

-- 5) Restauracion (operacion reversible y tambien admin-only) -----------
CREATE OR REPLACE FUNCTION fn_restaurar_negocio_admin(
  p_negocio_id INTEGER,
  p_actor_id INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_negocio businesses%ROWTYPE;
  v_rol INTEGER;
BEGIN
  SELECT rol_id INTO v_rol FROM usuarios WHERE id = p_actor_id;
  IF v_rol IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'Se requieren permisos de administrador'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_negocio FROM businesses WHERE id = p_negocio_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Negocio no encontrado' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('app.archivo_admin', 'on', true);
  UPDATE businesses
     SET eliminado_at = NULL, eliminado_por = NULL,
         motivo_eliminacion = NULL, updated_at = NOW()
   WHERE id = p_negocio_id;

  INSERT INTO business_identity_audit
    (business_id, owner_id, actor_id, actor_rol, accion, nombre_anterior, permitido)
  VALUES
    (p_negocio_id, v_negocio.owner_id, p_actor_id, 'ADMIN', 'restaurar',
     v_negocio.nombre, true);

  RETURN jsonb_build_object('id', p_negocio_id, 'nombre', v_negocio.nombre);
END;
$$;

-- Nota: no hay politicas RLS en este proyecto. El acceso a Postgres se
-- hace con el rol de DATABASE_URL (no con un JWT de Supabase), por lo que
-- la autorizacion por usuario se refuerza en el backend y ademas dentro de
-- estas funciones con `rol_id = 0`.
COMMIT;
