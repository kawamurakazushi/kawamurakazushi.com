import { array, guard, nullable, object, string } from "decoders";
import {
  CreateNodeArgs,
  CreatePagesArgs,
  Node,
  NodeInput,
  SourceNodesArgs,
} from "gatsby";
import { createFilePath } from "gatsby-source-filesystem";
import { GraphQLClient } from "graphql-request";
import fetch from "node-fetch";
import * as path from "path";

export const onCreateNode = async ({
  node,
  getNode,
  actions,
  createNodeId,
  createContentDigest,
}: CreateNodeArgs) => {
  const { createNodeField, createNode, createParentChildLink } = actions;

  // Create slug only if it is a markdown from File. It might be from README.md
  if (
    node.internal.type === "MarkdownRemark" &&
    node.parent &&
    getNode(node.parent).internal.type === "File"
  ) {
    const slug = createFilePath({ node, getNode, basePath: "pages" });
    createNodeField({
      name: "slug",
      node,
      value: slug,
    });
  }

  if (node.internal.type === "MarkdownRemark" && node.frontmatter) {
    try {
      const frontmatterDecoder = object({
        isbn: string,
      });

      const { isbn } = guard(frontmatterDecoder)(node.frontmatter);

      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
      const response = await fetch(url);
      const data = await response.json();
      let summary = null;

      if (data.totalItems > 0) {
        const item = data.items[0];
        summary = {
          author: item.volumeInfo.authors.join(" / "),
          cover: item.volumeInfo.imageLinks
            ? item.volumeInfo.imageLinks.thumbnail.replace("http", "https")
            : null,
          isbn: `${isbn}`,
          title: item.volumeInfo.title,
        };
      }

      if (summary === null) {
        const openDbData = await (
          await fetch(`https://api.openbd.jp/v1/get?isbn=${isbn}`)
        ).json();

        if (openDbData.length > 0) {
          const { author, cover, isbn, title } = openDbData[0].summary;
          summary = {
            author,
            cover,
            isbn,
            title,
          };
        }
      }

      // Make Node
      if (summary) {
        const bookNode: Node = {
          ...summary,
          children: [],
          id: createNodeId(isbn),
          internal: {
            contentDigest: createContentDigest({
              ...summary,
            }),
            owner: "",
            type: "Book",
          },
          parent: node.id,
        };

        createNode(bookNode);
        createParentChildLink({ parent: node, child: bookNode });
      }
    } catch (e) {}
  }
};

export const sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
}: SourceNodesArgs) => {
  require("dotenv").config({ path: "../.env" });
  const { createNode } = actions;

  // TODO: Make this a yml file
  const nodes = [
    { owner: "grepbox", name: "grepQL" },
    { owner: "kawamurakazushi", name: "CURRYLIFE" },
    { owner: "kawamurakazushi", name: "figma-map-maker" },
    { owner: "kawamurakazushi", name: "figma-walker" },
    { owner: "kawamurakazushi", name: "spice-blending-puzzle" },
    { owner: "kawamurakazushi", name: "tle-parser" },
    { owner: "kawamurakazushi", name: "react-native-loader2" },
    { owner: "kawamurakazushi", name: "vscode-grep" },
    { owner: "kawamurakazushi", name: "figma-format" },
    { owner: "kawamurakazushi", name: "figma-sort-it" },
    { owner: "kawamurakazushi", name: "pomopomo" },
    { owner: "kawamurakazushi", name: ".com" },
    { owner: "kawamurakazushi", name: "seo-editor" },
    { owner: "kawamurakazushi", name: "thyme" },
  ].map(async (p) => {
    const client = new GraphQLClient("https://api.github.com/graphql", {
      headers: { Authorization: `Bearer ${process.env.GITHUB_API_KEY}` },
    });

    const query = `
      query Repository($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          name
          description
          url
          homepageUrl
          repositoryTopics(first: 5) {
            edges {
              node {
                topic {
                  name
                }
              }
            }
          }
          object(expression: "master:README.md") {
            ... on Blob {
              text
            }
          }
          languages(first: 5) {
            edges {
              node {
                name
                color
              }
            }
          }
        }
      }
    `;

    const response = await client.request(query, {
      name: p.name,
      owner: p.owner,
    });

    const decode = guard(
      object({
        repository: object({
          description: string,
          homepageUrl: nullable(string),
          languages: object({
            edges: array(
              object({ node: object({ name: string, color: string }) })
            ),
          }),
          name: string,
          object: object({ text: string }),
          repositoryTopics: object({
            edges: array(
              object({ node: object({ topic: object({ name: string }) }) })
            ),
          }),
          url: string,
        }),
      })
    );

    const repository = decode(response).repository;

    const parentId = createNodeId(`project/${repository.name}`);
    const readmeId = createNodeId(`project/${repository.name}/readme`);

    const nodeData = {
      description: repository.description,
      homepageUrl: repository.homepageUrl,
      languages: repository.languages.edges.map(({ node }) => node),
      name: repository.name,
      slug: repository.name.replace(".", ""),
      topics: repository.repositoryTopics.edges.map(
        ({ node }) => node.topic.name
      ),
      url: repository.url,
    };

    const parentNode: NodeInput = {
      children: [],
      id: parentId,
      internal: {
        contentDigest: createContentDigest(nodeData),
        type: "project",
      },
      parent: undefined,
      readme___NODE: readmeId,
      ...nodeData,
    };

    const readme = repository.object.text.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      (match, alt, img) => {
        if (img.includes("http")) {
          return match;
        }
        return `![${alt}](https://raw.githubusercontent.com/${p.owner}/${repository.name}/master/${img})`;
      }
    );

    const readmeNode: NodeInput = {
      children: [],
      id: readmeId,
      internal: {
        content: readme,
        contentDigest: createContentDigest(readme),
        mediaType: `text/markdown`,
        type: "ProjectReadme",
      },
      parent: parentId,
    };

    return [parentNode, readmeNode];
  });

  return new Promise<void>(async (resolve, _) => {
    for (const [parentNode, readmeNode] of await Promise.all(nodes)) {
      createNode(parentNode);
      createNode(readmeNode);
    }
    resolve();
  });
};

export const createPages = ({ graphql, actions }: CreatePagesArgs) => {
  const { createPage } = actions;

  return new Promise<void>((resolve, reject) => {
    graphql(`
      {
        posts: allFile(
          filter: {
            sourceInstanceName: { eq: "posts" }
            internal: { mediaType: { eq: "text/markdown" } }
          }
        ) {
          edges {
            node {
              childMarkdownRemark {
                fields {
                  slug
                }
              }
            }
          }
        }
        books: allFile(
          filter: {
            sourceInstanceName: { eq: "books" }
            internal: { mediaType: { eq: "text/markdown" } }
          }
        ) {
          edges {
            node {
              childMarkdownRemark {
                frontmatter {
                  isbn
                }
              }
            }
          }
        }
        allProject {
          edges {
            node {
              id
              name
              slug
            }
          }
        }
        tags: allMarkdownRemark(limit: 2000) {
          group(field: frontmatter___tags) {
            fieldValue
          }
        }
      }
    `).then((result) => {
      const decode = guard(
        object({
          allProject: object({
            edges: array(
              object({
                node: object({
                  id: string,
                  name: string,
                  slug: string,
                }),
              })
            ),
          }),
          books: object({
            edges: array(
              object({
                node: object({
                  childMarkdownRemark: object({
                    frontmatter: object({ isbn: string }),
                  }),
                }),
              })
            ),
          }),
          posts: object({
            edges: array(
              object({
                node: object({
                  childMarkdownRemark: object({
                    fields: object({ slug: string }),
                  }),
                }),
              })
            ),
          }),
          tags: object({
            group: array(object({ fieldValue: string })),
          }),
        })
      );
      try {
        const data = decode(result.data);

        // create posts pages
        const posts = data.posts.edges;
        posts.forEach(({ node }, i) => {
          createPage({
            component: path.resolve(`./src/templates/blog.tsx`),
            context: {
              nextSlug:
                i === posts.length - 1
                  ? ""
                  : posts[i + 1].node.childMarkdownRemark.fields.slug, // FiXME: make it null instead of an empty string
              prevSlug:
                i === 0
                  ? ""
                  : posts[i - 1].node.childMarkdownRemark.fields.slug,
              slug: node.childMarkdownRemark.fields.slug,
            },
            path: node.childMarkdownRemark.fields.slug,
          });
        });

        // create /projects/{id} pages
        data.allProject.edges.forEach(({ node }) => {
          createPage({
            component: path.resolve(`./src/templates/project.tsx`),
            context: {
              id: node.id,
            },
            path: `projects/${node.slug}`,
          });
        });

        // create /tags/{name} pages
        data.tags.group.forEach(({ fieldValue }) => {
          createPage({
            component: path.resolve(`./src/templates/tag.tsx`),
            context: {
              tag: fieldValue,
            },
            path: `tags/${fieldValue}`,
          });
        });

        // create /books/{isbn} pages
        data.books.edges.forEach(({ node }) => {
          createPage({
            component: path.resolve(`./src/templates/book.tsx`),
            context: {
              isbn: node.childMarkdownRemark.frontmatter.isbn,
            },
            path: `books/${node.childMarkdownRemark.frontmatter.isbn}`,
          });
        });

        resolve();
      } catch (error) {
        reject(error);
        console.error(error);
      }
    });
  });
};
