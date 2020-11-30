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

    // Length of total hits window, default to 2 minutes
    this.TOTAL_HITS_INTERVAL = interval

    // Length of summary window, default to 10 seconds
    this.SUMMARY_INTERVAL = 10

    // Length of alerting cron, default to 1 second
    this.ALERTING_CRON_INTERVAL = 1

    // Object to keep track of total hits
    // Keys = (timestamp modulo total hits interval) --> 0,1,..,119
    // Values = {timestamp, totalCount for timestamps that have same modulo}
    this.totalHitsTracker = {}

    // Object to keep track of total hits
    // Keys = (timestamp modulo section hits interval) --> 0,1,..,9
    // Values = {timestamp, sections: { [section]: count}}
    this.sectionHitsTracker = {}

    // Flag to tell whether alert is currently on / off
    this.isOnAlert = false

    // Id of alerting cron. Will be cleared when there is no alert
    this.alertingCronId = null

    // Value of most hit section
    this.mostHitSection = null

    // Hit count of most hit section
    this.maxHit = 0

    // Counter of all hit sections, aggregated from this.sectionHitsTracker
    this.sectionCounter = {}

    if (this.interval === 0) {
      throw new Error('Interval must be a positive number')
    }
  }

  // Utility function to get timestamp from input
  // If there is no input, return current timestamp
  _getTimestamp (time) {
    if (time) {
      return dayjs(time, this.FORMAT).unix()
    }

    return dayjs().unix()
  }

  // Utility function to parse log using given regex
  _parseLog (log, regex) {
    const match = log.match(regex)

    if (!match) {
      throw new Error('Unable to parse log with wrong format. Log: ', log)
    }

    return log.match(regex)[1]
  }

  // Utility function to parse the section from log action
  _parseSection (action) {
    if (!action) {
      throw new Error('Unable to parse action with wrong format. Action: ', action)
    }

    return action.split(' ')[1].split('/')[1]
  }

  // Once called, will start listening to log file changes and update log stats
  consumeLogs () {
    try {
      this.tail = new Tail(this.logPath)
    } catch (err) {
      console.log('Error while opening log file.', err)
      return
    }

    console.log(`Ready to consume new logs from ${this.logPath} file.`)

    this.tail.on('line', (line) => {
      console.log('New log:', line)
      this.update(line)
    })

    this.tail.on('error', (error) => {
      console.log('Error during log parsing', error)
    })

    // Summary of most hit section, runs every 10 seconds
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

  // Update total hits given log timestamp
  updateTotalHits (timestamp) {
    const currentTimestamp = this._getTimestamp()

    if (timestamp < currentTimestamp) {
      console.log(`Skipping since log timestamp ${timestamp} is older than current timestamp ${currentTimestamp}`)
      return
    }

    const slot = timestamp % this.TOTAL_HITS_INTERVAL

    // Initiate slot if it does not exist yet
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

  // Sum up all the hit counts that are not outdated and divide by interval to get average hits
  // Average is not rounded to provide a more accurate estimation
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

      console.log(`High traffic generated an alert - hits = ${averageTotalHits}, threshold = ${this.threshold}, triggered at ${dayjs().format(this.FORMAT)}`)

      // Only one alert cron is needed
      if (this.alertingCronId !== null) {
        return
      }

      // Once alert is on, keep checking every second to see if traffic returned to normal
      this.alertingCronId = setInterval(() => {
        this.revisitAlertState()
      }, this.ALERTING_CRON_INTERVAL * 1000)
    } else {
      // Turn off alert when traffic returns to normal
      if (this.isOnAlert === true) {
        this.isOnAlert = false

        clearInterval(this.alertingCronId)

        this.alertingCronId = null

        console.log(`Traffic returned to normal - hits = ${averageTotalHits}, threshold = ${this.threshold}, triggered at ${dayjs().format(this.FORMAT)}`)
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

      // Aggregate section count from different slots and update max hit when new optima is found
      for (const section in this.sectionHitsTracker[slot].sections) {
        this.sectionCounter[section] = (this.sectionCounter[section] || 0) + this.sectionHitsTracker[slot].sections[section]

        if (this.sectionCounter[section] > this.maxHit) {
          this.maxHit = this.sectionCounter[section]
          this.mostHitSection = section
        }
      }
    }

    if (this.mostHitSection) {
      console.log(`Most hit section during last ${this.SUMMARY_INTERVAL} seconds: /${this.mostHitSection} . Hits = ${this.maxHit}`)
      return
    }

    console.log(`No traffic during last ${this.SUMMARY_INTERVAL} seconds`)
  }
}

module.exports = DataCat
