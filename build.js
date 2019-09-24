const template = require("handlebars");
const readdir = require("recursive-readdir");
const fs = require("fs");
const path = process.cwd() + "/src";
const sass = require("node-sass");
const autoprefixer = require("autoprefixer");
const postcss = require("postcss");
const minifyDir = require("minify-dir");

const fileName = file =>
  file
    .split("/")
    .slice(-1)[0]
    .split(".")[0];

(async () => {
  const sourceDir = await readdir("./src");
  const [meta] = sourceDir
    .filter(f => f.endsWith("meta.json"))
    .map(a => fs.readFileSync(a))
    .map(JSON.parse);

  const { layouts, components } = sourceDir
    .filter(f => f.endsWith(".hbs"))
    .filter(f => !f.includes("index.hbs"))
    .reduce(
      ({ layouts, components }, file) => {
        if (file.includes("components")) {
          return { layouts, components: [...components, file] };
        }
        return { layouts: [...layouts, file], components };
      },
      { layouts: [], components: [] }
    );
  layouts.forEach(file => {
    const [name, content] = [fileName(file), fs.readFileSync(file).toString()];
    template.registerPartial(name, content);
  });

  components.forEach(file => {
    const [name, content] = [fileName(file), fs.readFileSync(file).toString()];
    template.registerPartial(
      "c_" + name,
      template.compile(content, { noEscape: true })
    );
  });

  const [index] = sourceDir
    .filter(f => f.includes("index.hbs"))
    .map(f => fs.readFileSync(f).toString());

  sourceDir
    .filter(f => f.includes("/pages"))
    .map(f => {
      const content = fs.readFileSync(f).toString();
      const data = template.compile(index, { explicitPartialContext: false })({
        meta,
        content
      });
      fs.writeFileSync("./static/" + fileName(f) + ".html", data);
    });

  await Promise.all(
    sourceDir
      .filter(f => f.includes("main.scss"))
      .map(async f => {
        const compiled = sass.renderSync({
          file: f,
          includePaths: ["node_modules/foundation-sites/scss"]
        });
        await postcss([
          autoprefixer({
            overrideBrowserslist: ["last 2 version", "> 5%"]
          })
        ])
          .process(compiled.css, { map: false })
          .then(s => fs.writeFileSync("./static/style.css", s.css))
          .catch(e => {
            console.error(e);
          });
      })
  );
  if (process.env.CI) {
    minifyDir.minifyDirectory("./static", "./static");
    fs.writeFileSync("static/CNAME", process.env.DOMAIN || "test.redoran.net");
  }
})();
