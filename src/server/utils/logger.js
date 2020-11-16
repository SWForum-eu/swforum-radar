//
// IMPORTS
//
// libraries
const { createLogger, format, transports } = require('winston')
// modules
const { validLogLevel } = require('../../common/util/validator')

const fmt = format.combine(
    format.errors({ stack: true }),
    format.padLevels(),
    format.splat(),
    format.simple()
)

//
// Set development logger (same as default)
//
let logger = createLogger({
    level: 'info',
    transports: [
        new transports.Console({
            format: format.combine(format.colorize(), fmt),
        }),
    ],
})
logger.verbose('Configuring logger')

// fetch and validate configured log level
logger.debug(`process.env.LOG_LEVEL = ${process.env.LOG_LEVEL}`)
let level = process.env.LOG_LEVEL || 'info'
logger.debug(`unvalidated log level = ${level}`)
if (!validLogLevel(level)) {
    logger.warn('Invalid log level in configuration. Falling back to default "info" level')
    level = 'info'
}
logger.debug(`validated log level = ${level}`)
logger.level = level
logger.debug(`Log level set to ${logger.level}`)

//
// configure a production level logger
//
if (process.env.NODE_ENV == 'production') {
    logger.verbose('Configuring production logger')
    logger = createLogger({
        level: level,
        transports: [
            new transports.Console({
                level: 'error',
                format: format.combine(format.timestamp(), fmt),
            }),
            new transports.File({
                filename: 'error.log',
                level: 'error',
                format: format.combine(format.timestamp(), fmt),
            }),
            new transports.File({
                filename: 'combined.log',
                level,
                fmt,
            }),
        ],
    })
}

//
// EXPORTS
//
module.exports = { logger }
