import { graphql, Link, useStaticQuery } from "gatsby";
import React, { memo } from "react";

import ArticleItem from "../components/articleItem";
import Layout from "../components/layout";

export default memo(() => {
  const data = useStaticQuery(
    graphql`
      query IndexQuery {
        allProject {
          edges {
            node {
              name
              url
              description
            }
          }
        }
        allMarkdownRemark(
          sort: { order: DESC, fields: frontmatter___date }
          limit: 4
          filter: { fields: { slug: { ne: null } } }
        ) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                title
                date(formatString: "YYYY.MM.DD")
                tags
                category
                thumbnail {
                  childImageSharp {
                    sizes(maxWidth: 600) {
                      src
                    }
                  }
                }
              }
              excerpt(format: PLAIN)
            }
          }
        }
      }
    `
  );

  return (
    <Layout>
      <div className="flex flex-col">
        {data.allMarkdownRemark.edges.map(({ node }) => (
          <ArticleItem
            key={node.fields.slug}
            to={node.fields.slug}
            date={node.frontmatter.date}
            tags={node.frontmatter.tags}
            title={node.frontmatter.title}
            excerpt={node.excerpt}
          />
        ))}
        <div className="my-5 flex justify-center">
          <Link
            to="/blogs"
            className="text-center px-2 border-green-900 border-solid border-b text-green-900"
          >
            MORE
          </Link>
        </div>
      </div>
      <h2 className="font-bold my-3">PROJECTS</h2>
      {data.allProject.edges.map(({ node }) => (
        <div key={node.id} className="mb-5">
          <Link
            to={`/projects/${node.name}`}
            className="text-l font-medium hover:bg-black hover:text-white"
          >
            {node.name}
          </Link>
          <div className="text-xs mt-2">{node.description}</div>
        </div>
      ))}
    </Layout>
  );
});
