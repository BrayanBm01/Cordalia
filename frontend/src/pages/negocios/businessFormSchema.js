import { z } from 'zod'
import {
  PRECIO_MAX,
  isEmail,
  isValidBusinessName,
  isValidHttpUrl,
  isValidPhone,
} from '../../utils/validation'

export const MONEDAS = ['COP', 'USD', 'EUR', 'MXN', 'PEN']

// Categorías que manejan rango de precios en su ficha pública.
export const CATEGORIAS_CON_PRECIO = [
  'Restaurante', 'Hotel', 'Hostal', 'Tour', 'Agencia de viajes',
  'Experiencia turistica', 'Atraccion turistica',
]

/**
 * Schema compartido entre el formulario del vendedor y el del ADMIN.
 * Así ambas interfaces validan exactamente los mismos límites (longitudes,
 * teléfono, email, URL, monedas y precios por categoría). El backend sigue
 * siendo la autoridad final.
 */
export function buildBusinessSchema(categorias = []) {
  const nombresPorId = new Map(categorias.map((c) => [String(c.id), c.nombre]))

  const precioSchema = z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce
      .number()
      .finite('Precio inválido')
      .min(0, 'El precio no puede ser negativo')
      .max(PRECIO_MAX, `El precio máximo permitido es ${PRECIO_MAX}`)
      .refine(
        (v) => Math.round(v * 100) === v * 100,
        'El precio admite como máximo 2 decimales'
      )
  )

  return z
    .object({
      nombre: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .refine(
          isValidBusinessName,
          'El nombre debe tener entre 2 y 200 caracteres y contener letras o números'
        ),
      category_id: z.string().transform((v) => (v === '' ? '' : Number(v))),
      destination_id: z.string().transform((v) => (v === '' ? '' : Number(v))),
      descripcion: z.string().max(5000, 'Máximo 5000 caracteres').optional().or(z.literal('')),
      direccion: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
      telefono: z
        .string()
        .refine((v) => v === '' || isValidPhone(v), 'Teléfono inválido (7 a 15 dígitos)')
        .optional()
        .or(z.literal('')),
      whatsapp: z
        .string()
        .refine((v) => v === '' || isValidPhone(v), 'WhatsApp inválido (7 a 15 dígitos)')
        .optional()
        .or(z.literal('')),
      email_contacto: z
        .string()
        .refine((v) => v === '' || isEmail(v), 'Email de contacto inválido')
        .optional()
        .or(z.literal('')),
      website: z
        .string()
        .refine((v) => v === '' || isValidHttpUrl(v), 'URL inválida (http/https)')
        .optional()
        .or(z.literal('')),
      portada_url: z
        .string()
        .refine(
          (v) => v === '' || isValidHttpUrl(v) || /^data:image\//i.test(v),
          'URL inválida (http/https o imagen base64)'
        )
        .optional()
        .or(z.literal('')),
      moneda: z.enum(MONEDAS, { message: 'Selecciona una moneda válida' }),
      precio_min: precioSchema.optional(),
      precio_max: precioSchema.optional(),
    })
    .superRefine((d, ctx) => {
      const nombre = nombresPorId.get(String(d.category_id))
      const requierePrecio = !!nombre && CATEGORIAS_CON_PRECIO.includes(nombre)

      if (requierePrecio) {
        if (d.precio_min === undefined || d.precio_min === '') {
          ctx.addIssue({ code: 'custom', path: ['precio_min'], message: 'Requerido para esta categoría' })
        }
        if (d.precio_max === undefined || d.precio_max === '') {
          ctx.addIssue({ code: 'custom', path: ['precio_max'], message: 'Requerido para esta categoría' })
        }
      }

      if (d.precio_max !== undefined && d.precio_min !== undefined && Number(d.precio_max) < Number(d.precio_min)) {
        ctx.addIssue({ code: 'custom', path: ['precio_max'], message: 'El precio máximo no puede ser menor que el mínimo' })
      }
    })
}
