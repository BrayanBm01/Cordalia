import { formatCOP } from '../pages/negocios/businessUtils'

export default function MoneyInput({
  value = '',
  onChange,
  placeholder,
  className = '',
  disabled,
  required,
  id,
  name,
  maxLength = 15,
}) {
  const text = formatCOP(value)

  function handleChange(e) {
    const digits = String(e.target.value).replace(/\D/g, '').slice(0, maxLength)
    onChange(digits === '' ? null : Number(digits))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      required={required}
      id={id}
      name={name}
    />
  )
}