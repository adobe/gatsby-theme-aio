/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const AlgoliaHTMLExtractor = require('algolia-html-extractor');
const fs = require('fs');
const normalizePath = require('normalize-path');

/**
 * Support of "import" directive:
 * https://github.com/adobe/gatsby-theme-aio#embedding-markdown-documents-and-filtering-content
 *
 * Parse index records from cache files.
 */
class CreateRecordsForEmbeddedContent {
  constructor(options = {}) {
    this.htmlExtractor = new AlgoliaHTMLExtractor();
  }

  execute(node, options) {
    const { fileAbsolutePath, objectID, title, slug, headings, ...restNodeFields } = node;
    const [siteDirAbsolutePath, sourceFileRelativePath] = normalizePath(fileAbsolutePath).split(options.pagesSourceDir);

    const publicSourceFilePath = `${siteDirAbsolutePath}${options.publicDir}${sourceFileRelativePath}`;
    const sourceFileExtension = new RegExp(`\.${options.sourceFileExtension}$`);
    const publicFileExtension = `.${options.publicFileExtension}`;

    let cacheFileAbsolutePath;
    const isIndexFile = sourceFileRelativePath.split('/').pop() === 'index.md';

    if (isIndexFile) {
      cacheFileAbsolutePath = publicSourceFilePath.replace(sourceFileExtension, publicFileExtension);
    } else {
      cacheFileAbsolutePath = publicSourceFilePath.replace(sourceFileExtension, '/') + 'index.html';
    }

    if (!fs.existsSync(cacheFileAbsolutePath)) {
      throw Error(`Cache file resolving error: no such file "${cacheFileAbsolutePath}"`);
    }

    const fileContent = fs.readFileSync(cacheFileAbsolutePath, 'utf8');

    const extractedData = this.htmlExtractor
      .run(fileContent, { cssSelector: options.tagsToIndex })
      .filter((htmlTag) => htmlTag.content.length >= options.minCharsLengthPerTag);

    return extractedData.map((htmlTag) => ({
      objectID: htmlTag.objectID,
      title: title === '' || title == null ? htmlTag.headings[0]?.value : title,
      ...restNodeFields,
      previousHeadings: htmlTag.headings,
      contentHeading: htmlTag.headings.slice(-1)[0],
      content: htmlTag.content,
      slug: slug,
      anchor: `#${headings
        .slice(-1)
        .toString()
        ?.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
        ?.map((s) => s.toLowerCase())
        .join('-')}`,
      customRanking: htmlTag.customRanking,
      pageID: objectID
    }));
  }
}
module.exports = CreateRecordsForEmbeddedContent;
