require('dotenv').config()
const express  = require('express')
const cors     = require('cors')
const soccerRouter  = require('./routes/soccer')
const nbaRouter     = require('./routes/nba')
const cricketRouter = require('./routes/cricket')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
})

app.use('/api/soccer',  soccerRouter)
app.use('/api/nba',     nbaRouter)
app.use('/api/cricket', cricketRouter)

// Generic 404 for unmatched /api routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` })
})

app.listen(PORT, () => {
  console.log(`\n🚀 Semantic Sports API running on http://localhost:${PORT}`)
  console.log(`   /api/soccer?league=PL   — Premier League`)
  console.log(`   /api/soccer?league=PD   — La Liga`)
  console.log(`   /api/nba                — NBA`)
  console.log(`   /api/cricket?comp=ipl   — IPL`)
  console.log(`   /api/cricket?comp=intl  — International`)
  console.log(`   /api/cricket?comp=icc   — ICC tournaments\n`)
})

module.exports = app
