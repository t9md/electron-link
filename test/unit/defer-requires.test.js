'use strict'

const assert = require('assert')
const dedent = require('dedent')
const deferRequires = require('../../lib/defer-requires')

describe('deferRequires(source, deferredModules)', () => {
  it('replaces top-level variables that depend on requiring deferred modules with lazy functions', () => {
    // simple require
    assert.equal(deferRequires(dedent`
      const a = require('a')
      const b = require('b')
      function main () {
        return a + b
      }
    `, new Set(['a'])), dedent`
      let a;

      function get_a() {
        return a = a || require('a');
      }

      const b = require('b')
      function main () {
        return get_a() + b
      }
    `)

    // top-level variables assignments that depend on previous requires
    assert.equal(deferRequires(dedent`
      const a = require('a')
      const b = require('b')
      const c = require('c').c.d
      var e
      e = c.e
      const f = b.f
      function main () {
        c.foo()
        e()
      }
    `, new Set(['a', 'c'])), dedent`
      let a;

      function get_a() {
        return a = a || require('a');
      }

      const b = require('b')
      let c;

      function get_c() {
        return c = c || require('c').c.d;
      }

      var e
      function get_e() {
        return e = e || get_c().e;
      };
      const f = b.f
      function main () {
        get_c().foo()
        get_e()()
      }
    `)

    // top-level usage of deferred modules
    assert.throws(() => {
      deferRequires(dedent`
        var a = require('a')
        a()
      `, new Set(['a']))
    })
    assert.throws(() => {
      deferRequires(dedent`
        require('a')()
      `, new Set(['a']))
    })
  })
})
