/** Copy the complete SVG file contents as plain text, without image representations. */
export async function copySvgText(svg:string):Promise<void>{
  if(!navigator.clipboard?.writeText)throw new Error('Die Zwischenablage benötigt HTTPS oder localhost. Bitte nutze Download.');
  await navigator.clipboard.writeText(svg);
}
