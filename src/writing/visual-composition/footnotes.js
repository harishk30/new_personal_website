export const harnessSentence = 'These models were each tested with and without a visual harness.';

export const harnessPrompt = `Answer the visual multiple-choice question using evidence from the image. Reason carefully before deciding.

The image is available inline and at \`input_image\`. Python, Pillow, and NumPy are installed. When uncertainty concerns a visual detail, use \`exec_command\` to inspect, crop, zoom, or measure the image, and \`view_image\` to examine the result. Describing a crop or imagining a zoom is not a substitute for executing the tool. If the answer is clear, answer directly. Reconsider your answer when tool results contradict your initial interpretation.

Execute the function calls, inspect their returned results, and use those results to decide whether further analysis is needed. Do not claim to have run a command or inspected a generated image unless you actually did so.

Internet access is unavailable. You have at most 10 turns, including your final answer. Each tool-call cycle uses a turn.

Finish with a brief explanation followed by \`Answer: <letter>\`.`;

export default function ArticleFootnotes() {
  return <section className="article-footnotes" aria-labelledby="footnotes">
    <h2 id="footnotes">Footnotes</h2>
    <ol>
      <li id="fn-harness" tabIndex={-1}>
        <p>The harness used was Codex CLI 0.146.1, with the default coding prompt being replaced by a vision-specific prompt.{' '}
          <a href="#fnref-harness" role="doc-backlink" aria-label="Return to footnote 1 in the article">&#8617;</a>
        </p>
        <details>
          <summary>View system prompt</summary>
          <pre tabIndex={0} aria-label="Vision-specific system prompt">{harnessPrompt}</pre>
        </details>
      </li>
    </ol>
  </section>;
}
