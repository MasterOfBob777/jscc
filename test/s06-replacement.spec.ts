import { testStr } from './helpers/test-str'

describe('Code Replacement', function () {

  it('memvars prefixed by "$" can be used for simple code replacement', function () {
    testStr([
      '//#set _TRUE true',
      '//#set _ONE 1',
      '$_TRUE==$_ONE',
      '//#set _STR = "OK"',
      '"$_STR"',
    ], 'true==1\n"OK"')
  })

  it('the prefix "$" is used to paste jscc varname values', function () {
    testStr('$_TRUE$_TRUE', 'OKOK', { values: { _TRUE: 'OK' } })
  })

  it('primitive string or String intance must output its unquoted value', function () {
    testStr([
      '$_V1',
      '$_V2',
      '$_O.v1',
      '$_O.v2',
      '$_O',
    ], [
      'OK',
      'OK',
      'OK',
      'OK',
      '{"v1":"OK","v2":"OK"}',
    ].join('\n'), {
      // tslint:disable-next-line:no-construct
      values: { _V1: 'OK', _V2: new String('OK'), _O: { v1: 'OK', v2: new String('OK') } },
    })
  })

  it('quotes inside strings must be included in the output', function () {
    testStr([
      '$_V1',
      '$_V2',
      '$_O.v1',
      '$_O.v2',
      '$_O',
    ], [
      '"OK"',
      "'OK'",
      '"OK"',
      "'OK'",
      '{"v1":"\\"OK\\"","v2":"\'OK\'"}',
    ].join('\n'), {
      // tslint:disable-next-line:no-construct
      values: { _V1: '"OK"', _V2: new String("'OK'"), _O: { v1: '"OK"', v2: new String("'OK'") } },
    })
  })

  it('Date objects must output its unquoted JSON value', function () {
    const D = new Date('2018-10-17T00:00:00.0Z').toJSON()
    testStr([
      `//#set _V1 new Date("${D}")`,
      '//#set _V2 new Date(NaN)',
      `//#set _O {v1:new Date("${D}"),v2:new Date(NaN)}`,
      '$_V1',
      '$_V2',
      '$_O.v1,$_O.v2',
      '$_O',
    ], [
      D,
      'null',
      D + ',null',
      `{"v1":"${D}","v2":null}`,
    ].join('\n'))
  })

  it('Regex objects must output its unquoted `source` value', function () {
    const R1 = /\s\\/.source
    const R2 = R1.replace(/\\/g, '\\\\')
    testStr([
      `//#set _R1 new RegExp("${R2}")`,
      `//#set _R2 /${R1}/`,
      `//#set _O {r:/${R1}/}`,
      '/$_R1/',
      '/$_R2/',
      '/$_O.r/',
      '$_O',
    ],
    [
      `/${R1}/`,
      `/${R1}/`,
      `/${R1}/`,
      `{"r":"${R2}"}`,
    ].join('\n'))
  })

  it('Regex must escape quoted `source` only in objects', function () {
    testStr([
      `//#set _R1 /"'/`,
      `//#set _O {r:/"'/}`,
      '/$_R1/',
      '/$_O.r/',
      '$_O',
    ],
    [
      `/"'/`,
      `/"'/`,
      `{"r":"\\\"'"}`,
    ].join('\n'))
  })

  it('Infinity, -Infinity, and NaN numbers has custom output', function () {
    const v1 = JSON.stringify(Number.MAX_VALUE)
    const v2 = JSON.stringify(Number.MIN_VALUE)
    testStr([
      '//#set _V1 Infinity',
      '//#set _V2 new Number(Infinity)',
      '//#set _V3 -Infinity',
      '//#set _V4 new Number(-Infinity)',
      '//#set _O {v1:Infinity, v2:-Infinity, v3:new Number(-Infinity), v4:NaN}',
      '$_V1',
      '$_V2',
      '$_V3',
      '$_V4',
      '$_O.v1',
      '$_O.v2',
      '$_O.v3',
      '$_O.v4',
      '$_O',
    ],
    [
      'Infinity',
      'Infinity',
      '-Infinity',
      '-Infinity',
      'Infinity',
      '-Infinity',
      '-Infinity',
      'null',
      `{"v1":${v1},"v2":${v2},"v3":${v2},"v4":null}`,
    ].join('\n'))
  })

  it('`NaN` values on object instances must output `null`', function () {
    testStr([
      '//#set _N new Number(NaN)',
      '//#set _D new Date(NaN)',
      '$_N',
      '$_D',
    ], 'null\nnull')
  })

  it('Do not confuse `Infinity` with the string "Infinity"', function () {
    testStr([
      '//#set _V1 "Infinity"',
      '//#set _V2 new String("Infinity")',
      '//#set _V3 "-Infinity"',
      '//#set _V4 new String("-Infinity")',
      '//#set _O {v1:_V1,v2:_V2,v3:_V3}',
      '$_V1',
      '$_V2',
      '$_V3',
      '$_V4',
      '$_O.v1',
      '$_O.v2',
      '$_O.v3',
      '$_O',
    ], [
      'Infinity',
      'Infinity',
      '-Infinity',
      '-Infinity',
      'Infinity',
      'Infinity',
      '-Infinity',
      '{"v1":"Infinity","v2":"Infinity","v3":"-Infinity"}',
    ].join('\n'))
  })

  it('must replace nested object properties (primitive values)', function () {
    testStr('$_O.p1.p2.p3', '1', { values: {
      _O: { p1: { p2: { p3: 1 } } },
    } })
  })

  it('must replace nested object properties (object values)', function () {
    testStr('$_O.p1.p2', '{"p3":1}', { values: {
      _O: { p1: { p2: { p3: 1 } } },
    } })
  })

  it('must handle quoted values in object properties', function () {
    testStr('$_O', '{"s1":"a\\\"s","s2":"a\'s","s3":"a\'\\\"s"}', { values: {
      _O: { s1: 'a"s', s2: "a's", s3: 'a\'"s' },
    } })
  })

  it('must concatenate nested object properties', function () {
    testStr('$_O1.p1.p2$_O2.p1.p2', 'V1', { values: {
      _O1: { p1: { p2: 'V' } },
      _O2: { p1: { p2: 1 } },
    } })
  })

  it('must ignore properties that follows primitive values', function () {
    testStr('$_O.p.ext', 'V.ext', { values: {
      _O: { p: 'V' },
    } })
  })

  it('must ignore properties enclosed by brackets', function () {
    testStr('$_O["p"]', '{"p":"V"}["p"]', { values: {
      _O: { p: 'V' },
    } })
    testStr('$_A[0]', '["V"][0]', { values: {
      _A: ['V'],
    } })
  })

  it('must replace values in arrays, with dot notation', function () {
    testStr('$_A.1', '2', { values: {
      _A: [1, 2],
    } })
  })

  it('must replace nested properties of objects in arrays', function () {
    testStr('$_A.0.p1.p2', '1', { values: {
      _A: [{ p1: { p2: 1 } }],
    } })
  })

  it('must replace nested properties of objects in arrays (alt)', function () {
    testStr('$_A.0', '{"p1":{"p2":1}}', { values: {
      _A: [{ p1: { p2: 1 } }],
    } })
  })

  it('must handle quoted elements in arrays', function () {
    testStr('$_A', '["a\\\"s","a\'s","a\'\\\"s"]', { values: {
      _A: ['a"s', "a's", 'a\'"s'],
    } })
  })

  it('must replace the same value multiple times', function () {
    testStr('$_A$_A\n$_A$_A', 'ZZ\nZZ', { values: {
      _A: 'Z',
    } })
  })

  it('must replace the same value multiple times (arrays)', function () {
    testStr('$_A.0$_A.0\n$_A.0$_A.0', 'ZZ\nZZ', { values: {
      _A: ['Z'],
    } })
  })

  it('escape single quotes in string, if required by `escapeQuotes`', function () {
    testStr('$_S', "str\\'s", {
      escapeQuotes: 'single',
      values: { _S: "str's" },
    })
    testStr("'$_S'", "'str\\'s'", {
      escapeQuotes: 'single',
      values: { _S: "str's" },
    })
    testStr('"$_S"', '"str\\\'s"', {
      escapeQuotes: 'single',
      values: { _S: "str's" },
    })
  })

  it('escape double quotes in string, if required by `escapeQuotes`', function () {
    testStr('$_S', 'str\\\"s', {
      escapeQuotes: 'double',
      values: { _S: 'str"s' },
    })
    testStr('"$_S"', '"str\\"s"', {
      escapeQuotes: 'double',
      values: { _S: 'str"s' },
    })
    testStr("'$_S'", "'str\\\"s'", {
      escapeQuotes: 'double',
      values: { _S: 'str"s' },
    })
  })

  it('escape both single and quotes in string, if required by `escapeQuotes`', function () {
    testStr('$_S', '\\"str\\\'s\\"', {
      escapeQuotes: 'both',
      values: { _S: '"str\'s"' },
    })
  })

  it('must not escape quotes in regexes, even if `escapeQuotes` is used', function () {
    testStr([
      `//#set _R1 /"'/`,
      `//#set _O {r:/"'/}`,
      '/$_R1/',
      '/$_O.r/',
      '$_O',
    ],
    [
      `/"'/`,
      `/"'/`,
      `{"r":"\\\"'"}`,
    ].join('\n'), {
      escapeQuotes: 'both',
    })
  })

  it('must escape quotes in the output of nested values, if required', function () {
    testStr('$_O.s', "str\\'s", {
      escapeQuotes: 'single',
      values: { _O: { s: "str's" } },
    })
    testStr('$_O.s', 'str\\"s', {
      escapeQuotes: 'double',
      values: { _O: { s: 'str"s' } },
    })
    testStr('$_O.s', '\\"str\\\'s\\"', {
      escapeQuotes: 'both',
      values: { _O: { s: '"str\'s"' } },
    })
  })

})
