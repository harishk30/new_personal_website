// Preserve source text in the data; normalize only its presentation.
export function reasoningMarkdown(source) {
    const toolText = [];
    const text = source.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, block => {
        toolText.push(block);
        return `TRACE_TOOL_TEXT_${toolText.length - 1}`;
    }).replace(/^\s*<\/?(?:think|anth Thinking|parameter)>\s*$/gm, '');
    return text.replace(/TRACE_TOOL_TEXT_(\d+)/g, (_, index) => `\n\n\x60\x60\x60xml\n${toolText[Number(index)]}\n\x60\x60\x60\n`).trim();
}
export function commandText(source) {
    // Some saved function arguments have one extra escape layer.
    if (source.includes('\n') || !source.includes('\\n'))
        return source;
    return source.replace(/\\([\\nrt"])/g, (_, char) => ({ n: '\n', r: '\r', t: '\t', '"': '"', '\\': '\\' }[char]));
}
export function terminalText(source) {
    const output = source.match(/^Output:\n([\s\S]*)/m);
    if (!output)
        return source;
    const status = source.match(/Process exited with code (\d+)/);
    return (status && status[1] !== '0' ? `Exit status: ${status[1]}\n\n` : '') + output[1];
}
