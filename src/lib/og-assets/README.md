# Fonts for generated share images

`Nunito-Regular.ttf` and `Nunito-ExtraBold.ttf` are the latin subsets of
[Nunito](https://fonts.google.com/specimen/Nunito) by Vernon Adams, Cyreal and
Jacques Le Bailly, under the
[SIL Open Font License 1.1](https://openfontlicense.org/).

They are vendored rather than fetched at request time so that generating a
share image never depends on reaching an external host — a server behind a
firewall must still produce them.

The interface loads Nunito through `next/font/google`; these copies exist only
for `ImageResponse`, which needs the raw font data.
