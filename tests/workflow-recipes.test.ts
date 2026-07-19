import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_SERVICES } from '../scripts/setup-services.mjs'

/**
 * Recipe format enforcement (JOE-148). Every docs/workflows/*.md except the
 * index and guardrails pages is a recipe and must follow the documented
 * structure exactly, so future recipe issues inherit the format instead of
 * inventing one.
 */

const WORKFLOWS_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'docs', 'workflows')
const NON_RECIPES = new Set(['index.md', 'guardrails.md'])
const TOKEN_CLASSES = ['read', 'write', 'send', 'share', 'destructive', 'admin']
const REQUIRED_SECTIONS = [
  'Outcome',
  'Inputs',
  'Preflight',
  'Steps',
  'Confirmation gates',
  'Partial failure',
  'Cleanup and rollback',
  'Validation checklist',
  'Example prompt',
]

interface Frontmatter {
  recipe?: string
  title?: string
  outcome?: string
  services?: string[]
  token_classes?: string[]
  status?: string
}

function parseFrontmatter(content: string, file: string): Frontmatter {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content)
  assert.ok(match, `${file}: missing frontmatter block`)
  const result: Record<string, string | string[]> = {}
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line)
    assert.ok(kv, `${file}: unparseable frontmatter line (flat YAML only): ${line}`)
    const [, key, raw] = kv
    if (raw.startsWith('[')) {
      assert.ok(raw.endsWith(']'), `${file}: unterminated list for ${key}`)
      result[key] = raw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
    } else {
      result[key] = raw.trim()
    }
  }
  return result as Frontmatter
}

const recipeFiles = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.md') && !NON_RECIPES.has(f))

describe('workflow recipe format (JOE-148)', () => {
  it('finds at least one recipe', () => {
    assert.ok(recipeFiles.length >= 1)
  })

  for (const file of recipeFiles) {
    describe(file, () => {
      const content = readFileSync(join(WORKFLOWS_DIR, file), 'utf8')
      const front = parseFrontmatter(content, file)

      it('has complete, valid frontmatter', () => {
        assert.equal(front.recipe, basename(file, '.md'), 'recipe slug must match filename')
        assert.ok(front.title, 'title required')
        assert.ok(front.outcome && front.outcome.length > 20, 'outcome must be a real sentence')
        assert.ok(Array.isArray(front.services) && front.services.length > 0, 'services list required')
        for (const service of front.services!) {
          assert.ok(ALL_SERVICES.includes(service), `unknown service: ${service}`)
        }
        assert.ok(Array.isArray(front.token_classes) && front.token_classes.length > 0, 'token_classes list required')
        for (const cls of front.token_classes!) {
          assert.ok(TOKEN_CLASSES.includes(cls), `unknown token class: ${cls}`)
        }
        assert.ok(['skeleton', 'ready'].includes(front.status ?? ''), 'status must be skeleton or ready')
      })

      it('has every required section in order', () => {
        const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim())
        assert.deepEqual(headings, REQUIRED_SECTIONS, 'recipes have exactly the required ## sections, in order')
      })

      it('links to the shared guardrails and only calls declared services', () => {
        assert.match(content, /guardrails\.md/, 'must reference shared guardrails')
        // Every catalog-style tool mention must belong to a declared service.
        const tools = [...content.matchAll(/`(drive|gmail|calendar|sheets|slides|docs|tasks|forms)_[a-z_]+`/g)].map((m) => m[1])
        for (const service of tools) {
          assert.ok(front.services!.includes(service), `tool from undeclared service: ${service}`)
        }
      })

      it('is listed in the workflows index', () => {
        const index = readFileSync(join(WORKFLOWS_DIR, 'index.md'), 'utf8')
        assert.ok(index.includes(`(${file})`), `index.md must link to ${file}`)
      })
    })
  }
})
