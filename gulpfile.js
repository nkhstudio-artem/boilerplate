"use strict";

const { name } = require("./package.json"),
  { watch, series, parallel, src, dest } = require("gulp"),
  del = require("del"),
  path = require("path"),
  pug = require("gulp-pug"),
  sass = require("gulp-sass"),
  postcss = require("gulp-postcss"),
  prefix = require("autoprefixer"),
  cssnano = require("cssnano"),
  connect = require("gulp-connect"),
  normalizeWhitespace = require("postcss-normalize-whitespace"),
  strip = require("gulp-strip-comments"),
  gulpif = require("gulp-if"),
  imagemin = require("gulp-imagemin"),
  jpegtran = require("imagemin-jpegtran"),
  optipng = require("imagemin-optipng"),
  gifsicle = require("imagemin-gifsicle"),
  emitty = require("emitty").setup("src", "pug"),
  replaceExt = require("replace-ext"),
  plumber = require("gulp-plumber"),
  babel = require("gulp-babel"),
  include = require("gulp-include");

const paths = {
  markdowns: {
    src: "src/pages/*.pug",
    templates: "src/assets/templates/*.pug",
    include: "src/assets/blocks/**/*.pug",
    dist: "dist/pages"
  },

  styles: {
    src: "src/assets/styles/*.sass",
    include: "src/assets/blocks/**/*.sass",
    fonts: "src/assets/fonts/fonts.sass",
    dist: "dist/assets/styles"
  },

  scripts: {
    src: "src/assets/scripts/*.js",
    include: "src/assets/blocks/**/*.js",
    plugins: "src/assets/scripts/plugins/*.js",
    dist: "dist/assets/scripts"
  },

  scriptsPlugins: {
    src: "src/assets/scripts/plugins/*.js",
    dist: "dist/assets/scripts/plugins"
  },

  scriptsLibraries: {
    src: "src/assets/scripts/libraries/*.js",
    dist: "dist/assets/scripts/libraries"
  },

  images: {
    src: "src/assets/images/**/*.{png,jpg,jpeg,gif}",
    dist: "dist/assets/images"
  },

  icons: {
    src: "src/assets/icons/*.svg",
    dist: "dist/assets/icons"
  },

  fonts: {
    src: "src/assets/fonts/*.{ttf,otf,woff,woff2,svg,eot}",
    dist: "dist/assets/fonts"
  },

  server: {
    dist: ["dist", "dist/pages"]
  }
};

const markdowns = () => {
  return src(paths.markdowns.src)
    .pipe(plumber())
    .pipe(gulpif(global.watch, emitty.stream()))
    .pipe(
      pug({
        pretty: true
      })
    )
    .pipe(dest(paths.markdowns.dist))
    .pipe(connect.reload());
};

const styles = () => {
  const plugins = [
    prefix({
      browsers: ["last 4 version"],
      cascade: false,
    }),
    cssnano({
      discardComments: { removeAll: true },
      normalizeWhitespace: true
    })
  ];

  return src(paths.styles.src)
    .pipe(plumber())
    .pipe(
      sass({
        outputStyle: "expanded",
        includePaths: ["node_modules"]
      })
    )
    .pipe(postcss(plugins))
    .pipe(dest(paths.styles.dist))
    .pipe(connect.reload());
};

const scripts = () => {
  return src(paths.scripts.src)
    .pipe(plumber())
    .pipe(
      include({
        extensions: "js",
        hardFail: true,
        includePaths: [
          __dirname + "/node_modules",
          __dirname + "/src/assets/scripts"
        ]
      })
    )
    .pipe(
      babel({
        presets: ["@babel/env"]
      })
    )
    .pipe(dest(paths.scripts.dist))
    .pipe(connect.reload());
};

const scriptsPlugins = () => {
  return src(paths.scriptsPlugins.src)
    .pipe(dest(paths.scriptsPlugins.dist))
    .pipe(connect.reload());
};

const scriptsLibraries = () => {
  return src(paths.scriptsLibraries.src)
    .pipe(dest(paths.scriptsLibraries.dist))
    .pipe(connect.reload());
};

const images = () => {
  return src(paths.images.src)
    .pipe(
      imagemin([
        imagemin.gifsicle({ interlaced: true }),
        imagemin.jpegtran({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 2 })
      ])
    )
    .pipe(dest(paths.images.dist))
    .pipe(connect.reload());
};

const icons = () => {
  return src(paths.icons.src)
    .pipe(
      imagemin([
        imagemin.svgo({
          plugins: [{ removeViewBox: true }, { cleanupIDs: false }]
        })
      ])
    )
    .pipe(dest(paths.icons.dist))
    .pipe(connect.reload());
};

const fonts = () => {
  return src(paths.fonts.src)
    .pipe(dest(paths.fonts.dist))
    .pipe(connect.reload());
};

const server = () => {
  connect.server({
    name: name,
    root: paths.server.dist,
    livereload: true
  });
};

const watching = () => {
  global.watch = true;

  watch([paths.markdowns.src, paths.markdowns.templates, paths.markdowns.include], markdowns);
  watch([paths.styles.src, paths.styles.include, paths.styles.fonts], styles);
  watch([paths.scripts.src, paths.scripts.include], scripts);
  watch(paths.scriptsPlugins.src, scriptsPlugins);
  watch(paths.scriptsLibraries.src, scriptsLibraries);
  watch(paths.images.src, images);
  watch(paths.icons.src, icons);
  watch(paths.fonts.src, fonts);

  watch([
    paths.scripts.src,
    paths.scripts.include,
    paths.scriptsPlugins.src,
    paths.scriptsLibraries.src,
    paths.icons.src,
    paths.fonts.src,
    paths.markdowns.src,
    paths.markdowns.templates,
    paths.markdowns.include,
    paths.styles.src,
    paths.styles.include,
    paths.styles.fonts,
    paths.images.src
  ]).on("unlink", filepath => {
    const extension = path.extname(filepath);
    let src = path.relative(path.resolve("src"), filepath);

    if (extension === ".pug" || extension === ".sass") {
      if (extension === ".pug") {
        src = replaceExt(src, ".html");
      } else {
        src = replaceExt(src, ".css");
      }
    }

    let dest = path.resolve("dist", src);

    del.sync([dest]);
  });
};

exports.default = parallel(server, watching);
exports.build = series(markdowns, styles, scripts, scriptsPlugins, scriptsLibraries, images, icons, fonts);
