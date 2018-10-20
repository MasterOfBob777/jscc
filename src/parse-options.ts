import { escapeRegex } from './lib/escape-regex'
import { getPackageVersion } from './lib/get-package-version'
import { pathRelative } from './lib/path-relative'
import { VARNAME } from './regexes'

const DEF_PREFIX = /\/[/*]|<!--|<!/.source

/**
 * Default error handler to throw an error.
 *
 * @param error Error instance or string with the error
 */
const errorHandler = (error: string | Error) => {
  if (typeof error == 'string') {
    error = new Error(error)
  }
  throw error
}

/**
 * Helper function to convert prefixes to regex sources.
 *
 * If `prefix` is a regex, return its source, if it is a string, return it
 * escaped. Throw an Error if `prefix` is another type.
 *
 * @param prefix String or regex
 */
const parsePrefix = (prefix: any) => {
  if (prefix instanceof RegExp) {
    return prefix.source
  }
  if (typeof prefix == 'string') {
    return escapeRegex(prefix)
  }
  return errorHandler('jscc `prefixes` must be an array of strings or regexes')
}

/**
 * Check the user provided values of the source object.
 * If there's no error returns a shallow copy that includes the default
 * values for `_VERSION` and `_FILE`.
 *
 * Throws an Error if any the source object or a varname is invalid.
 *
 * @param srcValues User values
 * @param file Current filename
 */
const getValues = (srcValues: { [k: string]: any }, file: string) => {
  const values = Object.create(null) as JsccValues

  if (typeof srcValues != 'object') {
    return errorHandler('jscc values must be a plain object')
  }

  // Get a shallow copy of the values, must be set per file
  Object.keys(srcValues).forEach((v) => {
    if (VARNAME.test(v)) {
      values[v] = srcValues[v]
    } else {
      errorHandler(`Invalid memvar name: ${v}`)
    }
  })

  // File name is valid only for this instance
  values._FILE = pathRelative(file)

  // Set _VERSION once, keep any already existing
  values._VERSION = getPackageVersion(srcValues._VERSION)

  return values
}

/**
 * Get the normalized user options.
 *
 * @param file Name of the file to process
 * @param opts User options
 */
export function parseOptions (file: string, opts?: JsccOptions): JsccProps {
  opts = opts || {}

  // Extract the user defined values
  const values = getValues(opts.values || {}, file)

  // Extract the prefixes ---------------------------------------------------

  let prefixes = opts.prefixes || ''
  if (prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes]

    // Discard empty prefixes and ensure to get a string from the rest
    prefixes = list.filter(Boolean).map(parsePrefix)
  }

  prefixes = prefixes.length ? (prefixes as string[]).join('|') : DEF_PREFIX

  // Create and returns the normalized jscc props, we are done
  return {
    keepLines:  !!opts.keepLines,
    mapContent: !!opts.mapContent,
    mapHires:   opts.mapHires  !== false,
    sourceMap:  opts.sourceMap !== false,
    errorHandler,
    prefixes,
    values,
  }
}
