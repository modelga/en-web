const hb = require("handlebars");
const rd = require("recursive-readdir");
const fs = require("fs");
const path = process.cwd() + "/src";

const fileName = file =>
  file
    .split("/")
    .slice(-1)[0]
    .split(".")[0];

(async () => {
  const sourceDir = await rd("./src");
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
    hb.registerPartial(name, content);
  });

  components.forEach(file => {
    const [name, content] = [fileName(file), fs.readFileSync(file).toString()];
    hb.registerPartial("c_" + name, hb.compile(content, { noEscape: true }));
  });

  const [index] = sourceDir
    .filter(f => f.includes("index.hbs"))
    .map(f => fs.readFileSync(f).toString());

  sourceDir
    .filter(f => f.includes("/pages"))
    .map(f => {
      const content = fs.readFileSync(f);
      const data = hb.compile(index, { explicitPartialContext: false })({
        meta,
        content
      });
      fs.writeFileSync("./static/" + fileName(f) + ".html", data);
    });
})();
