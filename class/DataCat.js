const dayjs = require('dayjs')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const Tail = require('tail').Tail

dayjs.extend(customParseFormat)

class DataCat {
  constructor (logPath = '/tmp/access.log', threshold = 10, interval = 120) {
    this.logPath = logPath
    this.threshold = threshold
    this.FORMAT = 'DD/MMM/YYYY:HH:mm:ss ZZ'
    this.TIME_REGEX = /\[(.*?)\]/
    this.ACTION_REGEX = /\"(.*?)\"/
    this.TOTAL_HITS_INTERVAL = interval // Length of total hits window, default to 2 minutes
    this.SUMMARY_INTERVAL = 10 // Length of summary window, default to 10 seconds
    this.ALERTING_CRON_INTERVAL = 1 // Length of alerting cron, default to 1 second
    this.totalHitsTracker = {}
    this.sectionHitsTracker = {}
    this.isOnAlert = false
    this.alertingCronId = null
    this.mostHitSection = null
    this.maxHit = 0
    this.sectionCounter = {}

    if (this.interval === 0) {
      throw new Error('Interval must be a positive number')
    }
  }

  _getTimestamp (time) {
    if (time) {
      return dayjs(time, this.FORMAT).unix()
    }

    return dayjs().unix()
  }

  _parseLog (log, regex) {
    const match = log.match(regex)

    if (!match) {
      throw new Error('Unable to parse log with wrong format. Log: ', log)
    }

    return log.match(regex)[1]
  }

  _parseSection (action) {
    if (!action) {
      throw new Error('Unable to parse action with wrong format. Action: ', action)
    }

    return action.split(' ')[1].split('/')[1]
  }

  consumeLogs () {
    this.tail = new Tail(this.logPath)

    console.log(`Ready to consume new logs from ${this.logPath} file.`)

    this.tail.on('line', (line) => {
      console.log('New log', line)
      this.update(line)
    })

    this.tail.on('error', (error) => {
      console.log('Error during log parsing', error)
    })

    setInterval(() => {
      this.summarizeTraffic()
    }, this.SUMMARY_INTERVAL * 1000)
  }

  update (log, shouldUpdateSummary = true) {
    let timestamp

    try {
      timestamp = this._getTimestamp(this._parseLog(log, this.TIME_REGEX))
    } catch (err) {
      console.log('Error during log parsing. Skipping this log.')

      return
    }

    this.updateTotalHits(timestamp)

    if (shouldUpdateSummary) {
      this.updateSummary(log, timestamp)
    }
  }

  updateTotalHits (timestamp) {
    const currentTimestamp = this._getTimestamp()

    if (timestamp < currentTimestamp) {
      console.log(`Skipping since log timestamp ${timestamp} is older than current timestamp ${currentTimestamp}`)
      return
    }

    const slot = timestamp % this.TOTAL_HITS_INTERVAL

    if (slot in this.totalHitsTracker === false) {
      this.totalHitsTracker[slot] = {timestamp, total: 1}
      this.revisitAlertState()

      return
    }

    // If current slot is older than interval, reset it
    // Else increase counter
    if (currentTimestamp - this.totalHitsTracker[slot].timestamp > this.TOTAL_HITS_INTERVAL) {
      this.totalHitsTracker[slot] = {timestamp, total: 1}
    } else {
      // this.totalHitsTracker[slot].timestamp = timestamp
      this.totalHitsTracker[slot].total += 1
    }

    this.revisitAlertState()
  }

  getAverageTotalHits () {
    const currentTimestamp = this._getTimestamp()

    return Object.keys(this.totalHitsTracker)
      .filter(
        (slot) => (currentTimestamp - this.totalHitsTracker[slot].timestamp <= this.TOTAL_HITS_INTERVAL)
      )
      .reduce((prev, curr) => (prev + this.totalHitsTracker[curr].total), 0) / this.TOTAL_HITS_INTERVAL
  }

  // Check if alert should be turned on/off and adjust accordingly
  revisitAlertState () {
    const averageTotalHits = this.getAverageTotalHits()

    if (averageTotalHits > this.threshold) {
      this.isOnAlert = true

      console.log(`High traffic generated an alert - hits = ${averageTotalHits}, triggered at ${dayjs().format(this.FORMAT)}`)

      if (this.alertingCronId !== null) {
        return
      }

      this.alertingCronId = setInterval(() => {
        this.revisitAlertState()
      }, this.ALERTING_CRON_INTERVAL * 1000)
    } else {
      if (this.isOnAlert === true) {
        this.isOnAlert = false

        clearInterval(this.alertingCronId)

        this.alertingCronId = null

        console.log(`Traffic returned to normal - hits = ${averageTotalHits}, triggered at ${dayjs().format(this.FORMAT)}`)
      }
    }
  }

  updateSummary (log, timestamp) {
    const currentTimestamp = this._getTimestamp()

    if (timestamp < currentTimestamp) {
      console.log(`Skipping since log timestamp ${timestamp} is older than current timestamp ${currentTimestamp}`)
      return
    }

    let section

    try {
      section = this._parseSection(this._parseLog(log, this.ACTION_REGEX))
    } catch (err) {
      console.log('Error during log parsing. Skipping this log.')

      return
    }

    const slot = timestamp % this.SUMMARY_INTERVAL

    if (slot in this.sectionHitsTracker === false) {
      this.sectionHitsTracker[slot] = {timestamp, sections: {[section]: 1}}

      return
    }

    // If current slot is older than 10 seconds, reset it
    // Else increase counter
    if (currentTimestamp - this.sectionHitsTracker[slot].timestamp > this.SUMMARY_INTERVAL) {
      this.sectionHitsTracker[slot] = {timestamp, sections: {[section]: 1}}
    } else {
      this.sectionHitsTracker[slot].sections[section] = (this.sectionHitsTracker[slot].sections[section] || 0) + 1
    }
  }

  summarizeTraffic () {
    const currentTimestamp = this._getTimestamp()

    this.sectionCounter = {}
    this.mostHitSection = null
    this.maxHit = 0

    for (const slot in this.sectionHitsTracker) {
      if (currentTimestamp - this.sectionHitsTracker[slot].timestamp > this.SUMMARY_INTERVAL) {
        continue // old slot --> skip
      }

      const sections = this.sectionHitsTracker[slot].sections

      for (const section in this.sectionHitsTracker[slot].sections) {
        this.sectionCounter[section] = (this.sectionCounter[section] || 0) + this.sectionHitsTracker[slot].sections[section]

        if (this.sectionCounter[section] > this.maxHit) {
          this.maxHit = this.sectionCounter[section]
          this.mostHitSection = section
        }
      }
    }

    if (this.mostHitSection) {
      console.log(`Most hit section during last ${this.SUMMARY_INTERVAL} seconds : ${this.mostHitSection} . Hits = ${this.maxHit}`)
      return
    }

    console.log(`No traffic during last ${this.SUMMARY_INTERVAL} seconds`)
  }
}

module.exports = DataCat
