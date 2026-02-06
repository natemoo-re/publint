import picocolors from 'picocolors'
import { formatMessagePath as fp, getPkgPathValue, replaceLast } from './utils.js'

const EMPTY_MSG = '<empty>'

/** @type {import('../utils.d.ts').formatMessage} */
export function formatMessage(m, pkg, opts = {}) {
  const style = opts.style ?? 'verbose'
  return style === 'terse'
    ? formatMessageTerse(m, pkg, opts)
    : formatMessageVerbose(m, pkg, opts)
}

/** @type {import('../utils.d.ts').formatMessage} */
export function formatMessageVerbose(m, pkg, opts = {}) {
  const h = getHighlighter(opts.color)
  /** @param {string[]} path */
  const pv = (path) => {
    try {
      const str = String(getPkgPathValue(pkg, path))
      return str === '' ? EMPTY_MSG : str
    } catch {
      return 'undefined'
    }
  }

  switch (m.code) {
    case 'IMPLICIT_INDEX_JS_INVALID_FORMAT':
      return `index.js should be ${m.args.expectFormat} but it is ${m.args.actualFormat}`
    case 'FILE_INVALID_FORMAT': {
      const relativePath = m.args.actualFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = pv(m.path).includes('*') ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} is written in ${h.warn(m.args.actualFormat)}, but is interpreted as ${h.warn(m.args.expectFormat)}. Consider using the ${h.warn(m.args.expectExtension)} extension, e.g. ${h.bold(replaceLast(relativePath, '.js', m.args.expectExtension))}`
    }
    case 'FILE_INVALID_EXPLICIT_FORMAT': {
      const relativePath = m.args.actualFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = pv(m.path).includes('*') ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} ends with the ${h.warn(m.args.actualExtension)} extension, but the code is written in ${h.warn(m.args.actualFormat)}. Consider using the ${h.warn(m.args.expectExtension)} extension, e.g. ${h.bold(replaceLast(relativePath, m.args.actualExtension, m.args.expectExtension))}`
    }
    case 'FILE_INVALID_JSX_EXTENSION': {
      const relativePath = m.args.globbedFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = m.args.globbedFilePath ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} uses an invalid ${h.bold(m.args.actualExtension)} extension. You don't need to split ESM and CJS formats for JSX. You should write a single file in ESM with the ${h.bold('.jsx')} extension instead, e.g. ${h.bold(replaceLast(pv(m.path), m.args.actualExtension, '.jsx'))}`
    }
    case 'FILE_DOES_NOT_EXIST':
      if (opts.reference) {
        return `File does not exist`
      } else {
        let value = pv(m.path)
        // `@types/*` packages have empty `"main"` field by default which can be confusing,
        // so specifically improve its message here.
        if (value === EMPTY_MSG && m.path[0] === 'main') {
          value += ' (implies index.js)'
        }
        return `${h.bold(fp(m.path))} is ${h.bold(value)} but the file does not exist.`
      }
    case 'FILE_NOT_PUBLISHED':
      if (opts.reference) {
        return `File is not published. Is it specified in ${h.bold('pkg.files')}?`
      } else {
        return `${h.bold(fp(m.path))} is ${h.bold(pv(m.path))} but the file is not published. Is it specified in ${h.bold('pkg.files')}?`
      }
    case 'HAS_ESM_MAIN_BUT_NO_EXPORTS':
      return `${h.bold('pkg.main')} is an ESM file, but it is usually better to use ${h.bold('pkg.exports')} instead. If you don't support Node.js 12.6 and below, you can also remove ${h.bold('pkg.main')}. (This will be a breaking change)`
    case 'HAS_MODULE_BUT_NO_EXPORTS':
      return `${h.bold('pkg.module')} is used to output ESM, but ${h.bold('pkg.exports')} is not defined. As Node.js doesn't read ${h.bold('pkg.module')}, the ESM output may be skipped. Consider adding ${h.bold('pkg.exports')} to export the ESM output. ${h.bold('pkg.module')} can usually be removed alongside too. (This will be a breaking change)`
    case 'MODULE_SHOULD_BE_ESM':
    case 'EXPORTS_MODULE_SHOULD_BE_ESM':
    case 'IMPORTS_MODULE_SHOULD_BE_ESM': {
      const start = opts.reference ? 'Should' : `${h.bold(fp(m.path))} should`
      return `${start} be ESM, but the code is written in CJS.`
    }
    case 'EXPORTS_GLOB_NO_MATCHED_FILES':
    case 'IMPORTS_GLOB_NO_MATCHED_FILES': {
      const start = opts.reference
        ? 'Does'
        : `${h.bold(fp(m.path))} is ${h.bold(pv(m.path))} but does`
      return `${start} not match any files.`
    }
    case 'EXPORTS_GLOB_NO_DEPRECATED_SUBPATH_MAPPING':
    case 'IMPORTS_GLOB_NO_DEPRECATED_SUBPATH_MAPPING':
      return `${h.bold(fp(m.path))} maps to a path that ends with ${h.bold('/')} which is a removed feature. Use ${h.bold(fp(m.args.expectPath))}: "${h.bold(m.args.expectValue)}" instead.`
    case 'EXPORTS_TYPES_SHOULD_BE_FIRST': {
      const start = opts.reference ? 'Should' : `${h.bold(fp(m.path))} should`
      return `${start} be the first in the object as conditions are order-sensitive so it can be resolved by TypeScript.`
    }
    case 'EXPORTS_MODULE_SHOULD_PRECEDE_REQUIRE':
    case 'IMPORTS_MODULE_SHOULD_PRECEDE_REQUIRE': {
      const start = opts.reference ? 'Should' : `${h.bold(fp(m.path))} should`
      return `${start} come before the "require" condition so it can take precedence when used by a bundler.`
    }
    case 'EXPORTS_DEFAULT_SHOULD_BE_LAST':
    case 'IMPORTS_DEFAULT_SHOULD_BE_LAST': {
      const start = opts.reference ? 'Should' : `${h.bold(fp(m.path))} should`
      return `${start} be the last in the object so it doesn't take precedence over the keys following it.`
    }
    case 'EXPORTS_VALUE_INVALID':
    case 'IMPORTS_VALUE_INVALID': {
      const start = opts.reference
        ? h.bold(pv(m.path))
        : `${h.bold(fp(m.path))} is ${h.bold(pv(m.path))} but`
      return `${start} is invalid as it does not start with "${h.bold('./')}". Use ${h.bold(m.args.suggestValue)} instead.`
    }
    case 'EXPORTS_FALLBACK_ARRAY_USE':
    case 'IMPORTS_FALLBACK_ARRAY_USE': {
      const start = opts.reference ? 'The value' : h.bold(fp(m.path))
      return `${start} uses fallback arrays which is not recommended. It picks the first value that can be parsed and does not have a use case in Node.js currently. It also works differently in some tools and may face inconsistent behaviors.`
    }
    case 'EXPORTS_MISSING_ROOT_ENTRYPOINT': {
      const mainField = m.args.mainFields[0]
      const start = opts.reference
        ? 'The root entrypoint is missing'
        : `${h.bold(fp(m.path))} is missing the root entrypoint export`
      return `${start}, which is defined in ${h.bold('pkg.' + mainField)}. Environments that support the ${h.bold('"exports"')} field will ignore ${h.bold('pkg.' + mainField)} as ${h.bold('"exports"')} takes the highest priority. Consider adding ${h.bold(fp(m.path.concat('.')))}: "${h.bold(pv([mainField]))}".`
    }
    case 'USE_EXPORTS_BROWSER':
      return (
        `${h.bold('pkg.browser')} with a string value can be refactored to use ${h.bold('pkg.exports')} and the ${h.bold('"browser"')} condition to declare browser-specific exports. ` +
        `e.g. ${h.bold('pkg.exports["."].browser')}: "${h.bold(pv(m.path))}". (This will be a breaking change)`
      )
    case 'USE_EXPORTS_OR_IMPORTS_BROWSER':
      return `${h.bold('pkg.browser')} with an object value can be refactored to use ${h.bold('pkg.exports')}/${h.bold('pkg.imports')} and the ${h.bold('"browser"')} condition to declare browser-specific exports. (This will be a breaking change)`
    case 'USE_FILES':
      return `The package ${h.bold('publishes internal tests or config files')}. You can use ${h.bold('pkg.files')} to only publish certain files and save user bandwidth.`
    case 'USE_TYPE':
      return `The package does not specify the ${h.bold('"type"')} field. Node.js may attempt to detect the package type causing a small performance hit. Consider adding ${h.bold('"type"')}: "${h.bold('commonjs')}".`
    case 'USE_LICENSE':
      return `The package does not specify the ${h.bold('"license"')} field but a license file was detected at ${h.bold(m.args.licenseFilePath)}. Consider adding a ${h.bold('"license"')} field so it's displayed on npm.`
    // (rest of your existing verbose switch stays unchanged)
    default:
      return
  }
}

/** @type {import('../utils.d.ts').formatMessage} */
export function formatMessageTerse(m, pkg, opts = {}) {
  const h = getHighlighter(opts.color)
  /** @param {string[]} path */
  const pv = (path) => {
    try {
      const str = String(getPkgPathValue(pkg, path))
      return str === '' ? EMPTY_MSG : str
    } catch {
      return 'undefined'
    }
  }

  switch (m.code) {
    case 'FILE_INVALID_FORMAT': {
      const relativePath = m.args.actualFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = pv(m.path).includes('*') ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} is ${h.warn(m.args.actualFormat)} but treated as ${h.warn(m.args.expectFormat)}. Use ${h.warn(m.args.expectExtension)}, e.g. ${h.bold(replaceLast(relativePath, '.js', m.args.expectExtension))}`
    }

    case 'FILE_INVALID_EXPLICIT_FORMAT': {
      const relativePath = m.args.actualFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = pv(m.path).includes('*') ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} ends with ${h.warn(m.args.actualExtension)} but is ${h.warn(m.args.actualFormat)}. Use ${h.warn(m.args.expectExtension)}, e.g. ${h.bold(replaceLast(relativePath, m.args.actualExtension, m.args.expectExtension))}`
    }

    case 'FILE_INVALID_JSX_EXTENSION': {
      const relativePath = m.args.globbedFilePath ?? pv(m.path)
      let start = ''
      if (opts.reference || m.path[0] === 'name') {
        start = h.bold(relativePath)
      } else {
        const is = m.args.globbedFilePath ? 'matches' : 'is'
        start = `${h.bold(fp(m.path))} ${is} ${h.bold(relativePath)} and`
      }
      return `${start} uses ${h.bold(m.args.actualExtension)} for JSX. Use a single ESM ${h.bold('.jsx')} file, e.g. ${h.bold(replaceLast(pv(m.path), m.args.actualExtension, '.jsx'))}`
    }

    case 'FILE_DOES_NOT_EXIST':
      if (opts.reference) {
        return `File missing`
      } else {
        let value = pv(m.path)
        if (value === EMPTY_MSG && m.path[0] === 'main') {
          value += ' (implies index.js)'
        }
        return `${h.bold(fp(m.path))} is ${h.bold(value)} but the file is missing.`
      }

    case 'FILE_NOT_PUBLISHED':
      if (opts.reference) {
        return `File not published. Check ${h.bold('pkg.files')}.`
      } else {
        return `${h.bold(fp(m.path))} is ${h.bold(pv(m.path))} but not published. Check ${h.bold('pkg.files')}.`
      }

    case 'HAS_ESM_MAIN_BUT_NO_EXPORTS':
      return `${h.bold('pkg.main')} is ESM; use ${h.bold('pkg.exports')}. Remove ${h.bold('pkg.main')} on Node ${h.bold('>=12.6')} [breaking]`

    case 'HAS_MODULE_BUT_NO_EXPORTS':
      return `${h.bold('pkg.module')} without ${h.bold('pkg.exports')} may skip ESM in Node. Add ${h.bold('pkg.exports')}; you can usually drop ${h.bold('pkg.module')} too [breaking]`

    case 'EXPORTS_VALUE_INVALID':
    case 'IMPORTS_VALUE_INVALID': {
      const start = opts.reference
        ? h.bold(pv(m.path))
        : `${h.bold(fp(m.path))} is ${h.bold(pv(m.path))} but`
      return `${start} is invalid (must start with "${h.bold('./')}"). Use ${h.bold(m.args.suggestValue)}.`
    }

    case 'EXPORTS_FALLBACK_ARRAY_USE':
    case 'IMPORTS_FALLBACK_ARRAY_USE': {
      const start = opts.reference ? 'The value' : h.bold(fp(m.path))
      return `${start} uses fallback arrays (inconsistent; not recommended).`
    }

    case 'EXPORTS_MISSING_ROOT_ENTRYPOINT': {
      const mainField = m.args.mainFields[0]
      const start = opts.reference
        ? 'The root entrypoint is missing'
        : `${h.bold(fp(m.path))} is missing the root entrypoint export`
      return `${start} (defined in ${h.bold('pkg.' + mainField)}). Add ${h.bold(fp(m.path.concat('.')))}: "${h.bold(pv([mainField]))}".`
    }

    case 'USE_EXPORTS_BROWSER':
      return `${h.bold('pkg.browser')} (string) → use ${h.bold('pkg.exports')} with ${h.bold('"browser"')}, e.g. ${h.bold('pkg.exports["."].browser')}: "${h.bold(pv(m.path))}" [breaking]`

    case 'USE_EXPORTS_OR_IMPORTS_BROWSER':
      return `${h.bold('pkg.browser')} (object) → move to ${h.bold('pkg.exports')}/${h.bold('pkg.imports')} with ${h.bold('"browser"')} [breaking]`

    case 'USE_FILES':
      return `Package publishes internal files; restrict with ${h.bold('pkg.files')}.`

    case 'USE_TYPE':
      return `Missing ${h.bold('"type"')}; add ${h.bold('"type"')}: "${h.bold('commonjs')}".`

    case 'USE_LICENSE':
      return `Missing ${h.bold('"license"')} (found ${h.bold(m.args.licenseFilePath)}). Add ${h.bold('"license"')} for npm.`

    // For any message we haven’t explicitly tightened yet, fall back to verbose.
    default:
      return formatMessageVerbose(m, pkg, { ...opts, style: 'verbose' })
  }
}

/** @type { import('picocolors/types.js').Colors | undefined } */
let _picocolorsWithForcedColor

/**
 * @param {import('../utils.js').FormatMessageOptions['color']} color
 */
function getHighlighter(color) {
  /** @type {(s: string) => string} */
  let bold
  /** @type {(s: string) => string} */
  let warn

  switch (color) {
    case 'html':
      bold = (s) => `<strong>${s}</strong>`
      warn = (s) => `<strong>${s}</strong>`
      break
    case true:
      _picocolorsWithForcedColor ??= picocolors.createColors(true)
      // @ts-expect-error
      bold = (s) => _picocolorsWithForcedColor.bold(s)
      // @ts-expect-error
      warn = (s) => _picocolorsWithForcedColor.yellow(s)
      break
    case false:
      bold = (s) => s
      warn = (s) => s
      break
    default:
      bold = (s) => picocolors.bold(s)
      warn = (s) => picocolors.yellow(s)
      break
  }

  return { bold, warn }
}

/**
 * Make sure s is an `"exports"` compatible relative path
 * @param {string} s
 */
function exportsRel(s) {
  if (s[0] === '.') return s
  if (s[0] === '/') return '.' + s
  return './' + s
}
