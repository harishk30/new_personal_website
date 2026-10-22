import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const bibtex = `@article{krishnakumar2026visualcomposition,
  title  = {Visual Harnesses Are Compositional Generalizers:
            Rethinking How We Scale and Train VLMs},
  author = {Krishnakumar, Harish and Müller, Sebastian},
  year   = {2026},
  month  = {October},
  url    = {https://www.harishkk.com/writing/visual-composition}
}`;

export const references = [
  {
    id: 'zhang2026harnesses',
    authors: 'Alex Zhang and Omar Khattab',
    title: 'Language model harnesses are compositional generalizers',
    year: '2026',
    url: 'https://alexzhang13.github.io/blog/2026/harness/',
  },
  {
    id: 'tong2024eyes',
    authors: 'Shengbang Tong, Zhuang Liu, Yuexiang Zhai, Yi Ma, Yann LeCun, and Saining Xie',
    title: 'Eyes Wide Shut? Exploring the Visual Shortcomings of Multimodal LLMs',
    year: '2024',
    conference: 'CVPR',
    url: 'https://arxiv.org/abs/2401.06209v2',
  },
  {
    id: 'rahmanzadehgervi2024blind',
    authors: 'Pooyan Rahmanzadehgervi, Logan Bolton, Mohammad Reza Taesiri, and Anh Totti Nguyen',
    title: 'Vision language models are blind: Failing to translate detailed visual features into words',
    year: '2024',
    conference: 'ACCV',
    url: 'https://arxiv.org/abs/2407.06581v6',
  },
  {
    id: 'yin2026worldbench',
    authors: 'Yida Yin*, Harish Krishnakumar*, Chung Peng Lee, Boya Zeng, Wenhao Chai, Shengbang Tong, Wenhu Chen, Hu Xu, Xingyu Fu, Gabriel Sarch, Aleksandra Korolova, and Zhuang Liu',
    note: '* Equal contribution.',
    title: 'WorldBench: A Challenging and Visually Diverse Multimodal Reasoning Benchmark',
    year: '2026',
    url: 'https://arxiv.org/abs/2606.06538',
  },
];

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
    <h2 id="references">References</h2>
    <ol className="article-references" aria-labelledby="references">
      {references.map(reference => <li key={reference.id} id={`ref-${reference.id}`}>
        <a href={reference.url}>{reference.title}</a>
        <span className="reference-authors">{reference.authors}.</span>
        <span className="reference-publication">{reference.conference ? `${reference.conference}, ` : ''}{reference.year}.</span>
        {reference.note && <span className="reference-note">{reference.note}</span>}
      </li>)}
    </ol>
  </>;
}
