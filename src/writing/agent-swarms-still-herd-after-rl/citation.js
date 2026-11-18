import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const bibtex = `@article{2026agentswarms,
  title  = {Why Agent Swarms Still Herd After {RL}},
  author = {Krishnakumar, Harish and Chew, Ashton},
  year   = {2026},
  month  = {November},
  url    = {https://www.harishkk.com/writing/agent-swarms}
}`;

export default function ArticleCitation() {
  const [status, setStatus] = useState('');
  const codeRef = useRef(null);
  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(bibtex);
      setStatus('copied');
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setStatus('unavailable');
    }
  }
  return <>
    <h2 id="citation">Citation</h2>
    <div className="article-citation" aria-labelledby="citation">
      <div className="citation-toolbar">
        <span>BibTeX</span>
        <button type="button" onClick={copyCitation} aria-label="Copy BibTeX citation" title="Copy BibTeX citation">
          {status === 'copied' ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
        </button>
      </div>
      <pre tabIndex={0} aria-label="BibTeX citation"><code ref={codeRef}>{bibtex}</code></pre>
      <p className="citation-status" role="status">{status === 'copied' ? 'Citation copied.' : status === 'unavailable' ? 'Copy unavailable. Select and copy the citation manually.' : ''}</p>
    </div>
  </>;
}
