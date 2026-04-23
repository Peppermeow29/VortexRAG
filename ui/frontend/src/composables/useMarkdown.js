import { ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Pre-process math before marked parses it (protect from markdown mangling)
function extractMath(text) {
  const blocks = []
  // Replace display math $$...$$  and \[...\]
  let result = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
      const id = blocks.length
      blocks.push({ type: 'block', expr: expr.trim() })
      return `MATHBLOCK_${id}_END`
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => {
      const id = blocks.length
      blocks.push({ type: 'block', expr: expr.trim() })
      return `MATHBLOCK_${id}_END`
    })
    // Replace inline math $...$ and \(...\)
    .replace(/\$([^$\n]+?)\$/g, (_, expr) => {
      const id = blocks.length
      blocks.push({ type: 'inline', expr: expr.trim() })
      return `MATHINLINE_${id}_END`
    })
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => {
      const id = blocks.length
      blocks.push({ type: 'inline', expr: expr.trim() })
      return `MATHINLINE_${id}_END`
    })
  return { result, blocks }
}

function restoreMath(html, blocks) {
  return html
    .replace(/MATHBLOCK_(\d+)_END/g, (_, id) => {
      const b = blocks[Number(id)]
      if (!b) return ''
      try {
        return `<div class="math-block">${katex.renderToString(b.expr, { displayMode: true, throwOnError: false })}</div>`
      } catch {
        return `<div class="math-block math-error">${b.expr}</div>`
      }
    })
    .replace(/MATHINLINE_(\d+)_END/g, (_, id) => {
      const b = blocks[Number(id)]
      if (!b) return ''
      try {
        return katex.renderToString(b.expr, { displayMode: false, throwOnError: false })
      } catch {
        return `<span class="math-error">${b.expr}</span>`
      }
    })
}

// Configure marked with syntax highlighting using postprocess hook
marked.use({
  breaks: true,
  gfm: true,
  hooks: {
    postprocess(html) {
      // Highlight code blocks by replacing <code class="language-xxx"> with highlighted version
      return html.replace(
        /<code class="language-(\w+)">([\s\S]*?)<\/code>/g,
        (match, lang, code) => {
          try {
            // Decode HTML entities
            const decodedCode = code
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");

            if (hljs.getLanguage(lang)) {
              const highlighted = hljs.highlight(decodedCode, { language: lang }).value;
              return `<code class="language-${lang}">${highlighted}</code>`;
            }
          } catch (e) {
            console.error('[useMarkdown] Highlight error:', e);
          }
          return match;
        }
      );
    }
  }
})

function normalizeTableCellText(text) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

function escapeMarkdownCell(text) {
  return text.replace(/\|/g, '\\|')
}

function tableToMarkdown(table) {
  const allRows = Array.from(table.rows)
  if (!allRows.length) return ''

  let headerCells = []
  let bodyRows = []

  const thead = table.querySelector('thead')
  const tbody = table.querySelector('tbody')

  if (thead?.rows?.length) {
    headerCells = Array.from(thead.rows[0].cells).map(cell =>
      escapeMarkdownCell(normalizeTableCellText(cell.innerText || ''))
    )
    bodyRows = tbody ? Array.from(tbody.rows) : allRows.slice(1)
  } else {
    headerCells = Array.from(allRows[0].cells).map(cell =>
      escapeMarkdownCell(normalizeTableCellText(cell.innerText || ''))
    )
    bodyRows = allRows.slice(1)
  }

  if (!headerCells.length) return ''

  const headerLine = `| ${headerCells.join(' | ')} |`
  const separatorLine = `| ${headerCells.map(() => '---').join(' | ')} |`
  const bodyLines = bodyRows.map(row => {
    const cells = Array.from(row.cells).map(cell =>
      escapeMarkdownCell(normalizeTableCellText(cell.innerText || ''))
    )
    return `| ${cells.join(' | ')} |`
  })

  return [headerLine, separatorLine, ...bodyLines].filter(Boolean).join('\n')
}

function copyWithFeedback(text, buttonEl, idleText, okText) {
  const done = () => {
    buttonEl.classList.add('copied')
    const label = buttonEl.querySelector('span')
    if (label) label.textContent = okText
    setTimeout(() => {
      buttonEl.classList.remove('copied')
      if (label) label.textContent = idleText
    }, 1800)
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.top = '-1000px'
      document.body.appendChild(textarea)
      textarea.select()
      try { document.execCommand('copy'); done() } catch {}
      document.body.removeChild(textarea)
    })
  }
}

function unwrapLanguageBlocks(text, languages = []) {
  if (!languages.length || !text) return text
  const pattern = new RegExp("```\\s*(" + languages.join("|") + ")\\s*(?:\\r?\\n)([\\s\\S]*?)```", 'gi')
  return text.replace(pattern, (_, __, body) => (body || '').trim())
}

export function useMarkdown() {
  function render(text) {
    if (!text) return ''

    // Align original UI behavior: unwrap fenced markdown blocks like ```markdown ... ```
    const normalized = unwrapLanguageBlocks(text, ['markdown', 'md'])

    // Extract math before marked parses (prevents markdown from mangling LaTeX)
    const { result: withPlaceholders, blocks } = extractMath(normalized)

    const raw = marked.parse(withPlaceholders)

    // Restore math placeholders with KaTeX-rendered HTML
    const withMath = restoreMath(raw, blocks)

    return DOMPurify.sanitize(withMath, {
      ADD_ATTR: ['class', 'style', 'aria-hidden', 'focusable', 'role', 'viewBox', 'xmlns'],
      ADD_TAGS: ['svg', 'path', 'line', 'rect', 'circle', 'g', 'text', 'use', 'defs', 'symbol', 'mask', 'clipPath', 'marker', 'pattern', 'image', 'foreignObject', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder', 'mspace', 'mtable', 'mtr', 'mtd', 'annotation', 'semantics'],
      ALLOWED_TAGS: [
        'p','br','strong','em','code','pre','blockquote',
        'ul','ol','li','h1','h2','h3','h4','h5','h6',
        'a','img','table','thead','tbody','tr','th','td',
        'span','div','hr','svg','path','line','rect','circle','g',
        'text','use','defs','symbol','mask','clipPath'
      ],
      FORCE_BODY: false,
    })
  }

  function enhance(container, labels = { copy: 'Copy', copied: 'Copied!', copyTable: 'Copy Table', copiedTable: 'Copied!' }) {
    if (!container) return

    // Code blocks: add copy button wrapper + language label
    const pres = container.querySelectorAll('pre')
    pres.forEach(pre => {
      if (pre.closest('.code-block-wrapper')) return
      const code = pre.querySelector('code')
      if (!code) return

      const wrapper = document.createElement('div')
      wrapper.className = 'code-block-wrapper'

      // Extract language from class (e.g., "language-cpp" -> "cpp")
      const langMatch = code.className.match(/language-(\w+)/)
      const language = langMatch ? langMatch[1] : null

      // Create header with language label and copy button
      const header = document.createElement('div')
      header.className = 'code-block-header'

      if (language) {
        const langLabel = document.createElement('span')
        langLabel.className = 'code-block-lang'
        langLabel.textContent = language.toUpperCase()
        header.appendChild(langLabel)
      }

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'code-block-copy'
      btn.innerHTML = `<span>${labels.copy}</span>`
      btn.addEventListener('click', e => {
        e.stopPropagation()
        copyWithFeedback(code.innerText || '', btn, labels.copy, labels.copied)
      })
      header.appendChild(btn)

      const parent = pre.parentNode
      if (!parent) return
      parent.insertBefore(wrapper, pre)
      wrapper.appendChild(header)
      wrapper.appendChild(pre)
    })

    // Tables: wrap + copy as markdown
    const tables = container.querySelectorAll('table')
    tables.forEach(table => {
      if (table.closest('.table-block-wrapper')) return

      const wrapper = document.createElement('div')
      wrapper.className = 'table-block-wrapper'

      const scroll = document.createElement('div')
      scroll.className = 'table-scroll'

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'table-copy-btn'
      btn.innerHTML = `<span>${labels.copyTable}</span>`
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const md = tableToMarkdown(table)
        if (!md) return
        copyWithFeedback(md, btn, labels.copyTable, labels.copiedTable)
      })

      const parent = table.parentNode
      if (!parent) return
      parent.insertBefore(wrapper, table)
      wrapper.appendChild(btn)
      wrapper.appendChild(scroll)
      scroll.appendChild(table)
    })
  }

  return { render, enhance }
}

