const deepEqualInAnyOrder = require('deep-equal-in-any-order')
const chai = require('chai')

chai.use(deepEqualInAnyOrder)

const {expect} = chai

const DataCat = require('../class/DataCat')

const sleep = (timeout) => {
  console.log(`Going to sleep for ${timeout} milliseconds`)
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Woken up from sleep')
      resolve()
    }, timeout)
  })
}

describe('DataCat', () => {
  describe('#alerting()', () => {
    // Alert will trigger if there is more than 5 requests per second
    const threshold = 5

    // Length of window to measure. Default is 120 seconds. Using shorter window for test.
    const interval = 7

    const dataCat = new DataCat('alert.log', threshold, interval)

    it('should correctly adjust alert state', async () => {
      // Initially there should be no alert
      expect(dataCat.isOnAlert).to.be.equal(false)

      for (let i = 0; i < (dataCat.threshold - 2) * dataCat.TOTAL_HITS_INTERVAL; i++) {
        dataCat.updateTotalHits(dataCat._getTimestamp())
      }

      // At this point there should still be no alert since average hits = (threshold - 2)
      expect(dataCat.isOnAlert).to.be.equal(false)

      for (let i = 0; i < (dataCat.threshold + 2) * dataCat.TOTAL_HITS_INTERVAL; i++) {
        dataCat.updateTotalHits(dataCat._getTimestamp())
      }

      // Now there should be some alert since average hits
      // is around (threshold - 2) + (threshold + 2) = 2*threshold
      // The number might be a bit smaller in reality as the window might have
      // already moved some miliseconds between two loops but still it should
      // be enough to trigger the alert
      expect(dataCat.isOnAlert).to.be.equal(true)

      await sleep((interval + 2) * 1000)

      // should turn off alert after interval has passed
      expect(dataCat.isOnAlert).to.be.equal(false)
    }).timeout((interval + 4) * 1000)
  })

  describe('#summarizing()', () => {
    const dataCat = new DataCat('summarize.log')

    it('should correctly derive the most hit section', () => {
      const log1 = '83.149.9.216 - - [29/Nov/2020:18:14:00 +0000] "GET /public/metrics/summarize.php HTTP/1.1" 200 999'
      const log2 = '81.223.7.234 - - [29/Nov/2020:18:14:00 +0000] "GET /public/users/list.php HTTP/1.1" 200 999'
      const log3 = '84.112.6.105 - - [29/Nov/2020:18:14:00 +0000] "GET /health/status.php HTTP/1.1" 200 999'

      for (let i = 0; i < 6; i++) {
        dataCat.updateSummary(log1, dataCat._getTimestamp())
      }

      for (let i = 0; i < 4; i++) {
        dataCat.updateSummary(log2, dataCat._getTimestamp())
      }

      for (let i = 0; i < 9; i++) {
        dataCat.updateSummary(log3, dataCat._getTimestamp())
      }

      dataCat.summarizeTraffic()

      expect(dataCat.mostHitSection).to.be.equal('public')
      expect(dataCat.maxHit).to.be.equal(10)
      expect(dataCat.sectionCounter).to.deep.equalInAnyOrder({public: 10, health: 9})

      for (let i = 0; i < 5; i++) {
        dataCat.updateSummary(log3, dataCat._getTimestamp())
      }

      dataCat.summarizeTraffic()

      expect(dataCat.mostHitSection).to.be.equal('health')
      expect(dataCat.maxHit).to.be.equal(14)
      expect(dataCat.sectionCounter).to.deep.equalInAnyOrder({public: 10, health: 14})
    })
  })
})
