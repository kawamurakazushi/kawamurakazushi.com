import ApolloClient from "apollo-boost";
import { array, guard, object, string, nullable } from "decoders";
import {
  CreateNodeArgs,
  CreatePagesArgs,
  NodeInput,
  SourceNodesArgs,
} from "gatsby";
import { createFilePath } from "gatsby-source-filesystem";
import gql from "graphql-tag";
import * as path from "path";

export const onCreateNode = ({ node, getNode, actions }: CreateNodeArgs) => {
  const { createNodeField } = actions;

  // Create slug only if it is a markdown from File
  if (
    node.internal.type === "MarkdownRemark" &&
    getNode(node.parent).internal.type === "File"
  ) {
    const slug = createFilePath({ node, getNode, basePath: "pages" });
    createNodeField({
      name: "slug",
      node,
      value: slug,
    });
  }
};

export const sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
}: SourceNodesArgs) => {
  require("dotenv").config();
  const { createNode } = actions;

  const nodes = [
    "spice-blending-puzzle",
    "seo-editor",
    "figma-map-maker",
    "figma-walker",
    "figma-format",
    "figma-sort-it",
    "vscode-grep",
  ].map(async p => {
    const client = new ApolloClient({
      fetch: require("node-fetch"),
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_API_KEY}`,
      },
      uri: "https://api.github.com/graphql",
    });

    const response = await client.query({
      query: gql`
        query Repository($name: String!) {
          repository(owner: "kawamurakazushi", name: $name) {
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
      `,
      variables: { name: p },
    });

    const decode = guard(
      object({
        repository: object({
          description: string,
          homepageUrl: string,
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

    const repository = decode(response.data).repository;

    const parentId = createNodeId(`project/${repository.name}`);
    const readmeId = createNodeId(`project/${repository.name}/readme`);

    const nodeData = {
      description: repository.description,
      homepageUrl: repository.homepageUrl,
      languages: repository.languages.edges.map(({ node }) => node),
      name: repository.name,
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
      parent: null,
      readme___NODE: readmeId,
      ...nodeData,
    };

    const readme = repository.object.text.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      (match, alt, img) => {
        if (img.includes("http")) {
          return match;
        }
        return `![${alt}](https://raw.githubusercontent.com/kawamurakazushi/${repository.name}/master/${img})`;
      }
    );

    const readmeNode: NodeInput = {
      children: [],
      id: readmeId,
      internal: {
        content: readme,
        contentDigest: createContentDigest(readme),
        mediaType: `text/markdown`,
        type: "projectReadme",
      },
      parent: parentId,
    };

    return [parentNode, readmeNode];
  });

  return new Promise(async (resolve, _) => {
    for (const [parentNode, readmeNode] of await Promise.all(nodes)) {
      createNode(parentNode);
      createNode(readmeNode);
    }
    resolve();
  });
};

export const createPages = ({ graphql, actions }: CreatePagesArgs) => {
  const { createPage } = actions;

  return new Promise((resolve, _) => {
    graphql(`
      {
        allMarkdownRemark(filter: { fields: { slug: { ne: null } } }) {
          edges {
            node {
              fields {
                slug
              }
            }
          }
        }
        allProject {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `).then(result => {
      const decode = guard(
        object({
          allMarkdownRemark: object({
            edges: array(
              object({ node: object({ fields: object({ slug: string }) }) })
            ),
          }),
          allProject: object({
            edges: array(
              object({
                node: object({
                  id: string,
                  name: string,
                }),
              })
            ),
          }),
        })
      );
      const data = decode(result.data);

      data.allMarkdownRemark.edges.forEach(({ node }) => {
        createPage({
          component: path.resolve(`./src/templates/blog.tsx`),
          context: {
            slug: node.fields.slug,
          },
          path: node.fields.slug,
        });
      });

      data.allProject.edges.forEach(({ node }) => {
        createPage({
          component: path.resolve(`./src/templates/project.tsx`),
          context: {
            id: node.id,
          },
          path: `projects/${node.name}`,
        });
      });

      resolve();
    });
  });
};
