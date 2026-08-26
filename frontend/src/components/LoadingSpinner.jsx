export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className={`${sizes[size]} border-primary-500 border-t-transparent rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-dark-500 font-medium">{text}</p>}
    </div>
  )
}
