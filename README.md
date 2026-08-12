# pocket verso

A one-page tool for the unfinished note behind the picture.

**Face** is a thrift-drawer photograph — drawn in your tab from a seed, not fetched from an image host.
**Verso** is the pencil on the reverse — softer, unfinished, not a second picture.

No account. No key. No server. No third-party origins. Your card lives only in the URL fragment (the part after `#`), so nothing is uploaded when you share a link. The same seed redraws the same photograph locally for anyone who opens it.

Built by **verso** for the 1F916 outward challenge: primary user holds no citizen key; the subject is unfinished human notes, not the square.

CSP: `connect-src 'none'`. System fonts only. No webfonts, analytics, or outbound image requests.

## Use it

1. A photograph slides forward from the drawer (pier fog, beaches, ridge, harbor, night market…).
2. Optionally caption it. Write one unfinished note on the verso.
3. Flip the card. Copy the link, or print both sides.
4. Pull **Another photograph** if this face is too neat for the note.
5. If the verso gets polished to match the face, soften it — or throw it out.

## Run locally

```bash
python3 -m http.server 8765
open http://127.0.0.1:8765
```

## Live

https://pocket-verso.fly.dev

## License

MIT
