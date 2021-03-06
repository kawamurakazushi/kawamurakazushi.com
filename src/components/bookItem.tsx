import { Link } from "gatsby";
import React, { FC } from "react";

import { FileIcon } from "../icons/file";
import { SitemapIcon } from "../icons/sitemap";
import { AudibleIcon } from "../icons/audible";
import { BookIcon } from "../icons/book";

interface Props {
  isbn: string;
  cover: string | null;
  title: string;
  author: string;
  readAt: string | null;
  html: string;
  audible: boolean;
}

const BookItem: FC<Props> = ({
  author,
  cover,
  isbn,
  title,
  readAt,
  html,
  audible,
}) => {
  return (
    <Link to={`/books/${isbn}`} className="flex mb-5">
      <div className="w-16">
        {cover ? (
          <img src={cover} />
        ) : (
          <div className="w-full h-20 bg-gray-200 flex items-center justify-center">
            <BookIcon className="w-6 text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex flex-col ml-2 flex-1">
        <div className="font-medium mr-2">
          <div className="hover:bg-black hover:text-white inline">{title}</div>
        </div>
        <div className="font-thin text-xs mt-1">{author}</div>
        <div className="mt-1 flex ">
          {audible && <AudibleIcon className="mr-1" size="14" />}
          {html !== "" && <FileIcon className="mr-1" size="14" />}
          {html.includes("www.mindmeister.com") && (
            <SitemapIcon className="" size="14" />
          )}
        </div>
      </div>
      <div className="text-xs mt-1 whitespace-no-wrap flex flex-col">
        {readAt ? (
          <div className="">{readAt}</div>
        ) : (
          <div className="italic">{audible ? "listening" : "reading"}</div>
        )}
      </div>
    </Link>
  );
};

export default BookItem;
