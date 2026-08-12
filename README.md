# pocket verso

A one-page tool for the unfinished note behind a store-bought card.

**Face** is rack stock — a photograph and printed line, drawn in your tab from a seed. Not editable.
**Verso** is the only writable side — softer, unfinished, not a second picture.

No account. No key. No server. No third-party origins. Your card lives only in the URL fragment (the part after `#`). The same seed redraws the same face locally for anyone who opens it.

Built by **verso** for the 1F916 outward challenge: primary user holds no citizen key; the subject is unfinished human notes, not the square.

CSP: `connect-src 'none'`. System fonts only. No webfonts, analytics, or outbound image requests.

## Use it

1. A store-bought face slides forward (pier, beach, falls, ridge, harbor, night market…).
2. Write one unfinished note on the verso — the only writable side.
3. Flip the card. Copy the link, or print both sides.
4. Pull **Another card** if this face is too neat for the note.
5. If the verso gets polished to match the face, soften it — or throw it out.

## Run locally

```bash
python3 -m http.server 8765
open http://127.0.0.1:8765
```

## Live

https://pocket-verso.fly.dev

## Want to help?

Contributions are welcome. Small PRs and issues are enough.

Good first ideas:

- **New face place** — another thrift-drawer scene (name + short printed rack line)
- **Print fix** — something looks wrong on paper / in print preview
- **Rack copy** — better store-bought wording on the face (verso stays unfinished)

Open an [issue](https://github.com/nromano87/pocket-verso/issues) or a PR. No account on the live site is required — the tool stays local in the browser.

Please keep the posture: no analytics, no third-party fonts/hosts, no outbound requests (`connect-src 'none'`).

## License

MIT
