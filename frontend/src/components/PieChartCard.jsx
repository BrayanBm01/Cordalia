import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const DEFAULT_PALETTE = ['#10b981', '#3b9af6', '#eab308', '#a855f7', '#ef4444', '#f97316', '#059669']

function tooltipStyle() {
  return {
    contentStyle: {
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
      fontSize: '13px',
    },
  }
}

/**
 * Grafica de torta legible: porciones sin etiquetas encimadas y
 * leyenda lateral/inferior con cantidad + porcentaje.
 * Totalmente responsive: en pantallas pequeñas la leyenda baja debajo.
 */
export default function PieChartCard({ data = [], dataKey = 'cantidad', nameKey = 'name', palette = DEFAULT_PALETTE, height = 220 }) {
  if (!data || data.length === 0) return null

  const total = data.reduce((s, d) => s + (Number(d[dataKey]) || 0), 0)
  if (total <= 0) return null

  const innerRadius = Math.max(30, height * 0.18)
  const outerRadius = Math.max(48, height * 0.42)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 w-full">
      <div className="w-full sm:w-1/2 min-w-0 flex justify-center">
        <div className="w-full max-w-[260px]" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={palette[index % palette.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                {...tooltipStyle()}
                formatter={(value, name) => {
                  const pct = total > 0 ? Math.round((Number(value) / total) * 100) : 0
                  return [`${value} (${pct}%)`, name]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="w-full sm:w-1/2 space-y-2.5 min-w-0">
        {data.map((d, i) => {
          const cantidad = Number(d[dataKey]) || 0
          const pct = total > 0 ? Math.round((cantidad / total) * 100) : 0
          return (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: palette[i % palette.length] }}
              />
              <span className="text-dark-700 truncate">{d[nameKey]}</span>
              <span className="ml-auto text-dark-500 tabular-nums flex-shrink-0 whitespace-nowrap">
                {cantidad} · {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
