# maxwellyeo.com

Source and static archives for Maxwell Yeo's portfolio.

## Development

Node.js 24 LTS is recommended. Node.js 22 Maintenance LTS is also supported.

```sh
cd portfolio24
npm install
npm run dev
```

Vite serves the React application from `portfolio24/` and the unchanged files in
`static/` at their root URLs, including `/archive/2017/`.

## Deployment

Pushes to `main` build the React application and deploy the resulting `dist/`
directory to GitHub Pages. Generated build files are not committed.
