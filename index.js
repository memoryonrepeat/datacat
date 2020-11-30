const DataCat = require('./class/DataCat')

// Uncomment to use the sample.log file in same folder for testing
// Threshold and average count window can also be overridden
// by providing the 2nd and 3rd params accordingly (5 and 10 in this case)
// const dataCat = new DataCat('sample.log', 5, 10)

// This will default to read /tmp/access.log, with threshold = 10, window = 2 minutes
const dataCat = new DataCat()

dataCat.consumeLogs()
