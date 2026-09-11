import { useRef, useState } from 'react'
import { Upload, ImagePlus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const MAX_BYTES = 1500 * 1024 // 1.5 MB
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

/**
 * Selector de imagen dual: pegar URL (https://) o subir desde el dispositivo
 * (se convierte a base64 data-URL). Valida tipo y tamaño antes de aceptar.
 * - `value`: valor actual (url o data-url)
 * - `onChange`: recibe el nuevo valor
 * - `placeholder`: texto del input de URL
 */
export default function ImageUploader({ value = '', onChange, placeholder = 'URL de la imagen (https://)', preview = true }) {
  const fileRef = useRef(null)
  const [cargando, setCargando] = useState(false)

  function leerArchivo(file) {
    if (!file) return
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      toast.error('Formato no permitido: usa JPG, PNG, WEBP o GIF')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Imagen demasiado grande: máximo 1.5 MB')
      return
    }
    setCargando(true)
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result)
      setCargando(false)
    }
    reader.onerror = () => {
      toast.error('No se pudo leer la imagen')
      setCargando(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value.startsWith('data:') ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          type="text"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => leerArchivo(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary-200 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors cursor-pointer"
        >
          {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Seleccionar del dispositivo</span>
        </button>
      </div>
      {value.startsWith('data:') && (
        <div className="flex items-start gap-2 text-xs text-dark-500">
          <ImagePlus className="w-4 h-4 mt-0.5 shrink-0 text-primary-600" />
          <span className="flex-1">Imagen subida desde el dispositivo (base64). Los archivos se guardan localmente en la base de datos.</span>
          <button type="button" onClick={() => onChange('')} className="shrink-0 p-1 rounded text-dark-400 hover:text-red-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {preview && value && (
        <img src={value} alt="Vista previa" className="mt-1 h-32 w-32 object-cover rounded-lg border border-dark-100" />
      )}
    </div>
  )
}