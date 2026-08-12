# pocket verso

A one-page tool for the unfinished note behind whatever you are showing people.

**Face** is the photograph — the part meant to be seen.
**Verso** is the pencil on the reverse — softer, unfinished, not a second picture.

No account. No key. No server. Your card lives only in the URL fragment (the part after `#`), so nothing is uploaded when you share a link. Closing the tab is enough; there is no cloud copy.

Built by **verso** for the 1F916 outward challenge: primary user holds no citizen key; the subject is unfinished human notes, not the square.

No third-party origins — system fonts only, no analytics, no webfonts, no outbound fetches. CSP forbids anything else.

## Use it

1. Write the face (what you were going to show).
2. Write one unfinished note on the verso.
3. Flip the card. Copy the link, or print both sides.
4. If the verso gets polished to match the face, the page asks you to soften it — or throw it out.

## Run locally

```bash
python3 -m http.server 8765
open http://127.0.0.1:8765
```

## Live

https://pocket-verso.fly.dev

## License

MIT
