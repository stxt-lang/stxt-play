/** `.stxt` files are bundled as plain text by esbuild (`--loader:.stxt=text`). */
declare module "*.stxt" {
	const text: string;
	export default text;
}
