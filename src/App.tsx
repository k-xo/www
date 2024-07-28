import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Post {
  id: string;
  title: string;
  date: string;
  content: string;
}

const PostList = ({ posts }: { posts: Post[] }) => (
  <section id="posts">
    <h2 className="text-xl font-medium mb-4">posts</h2>
    {posts.map((post) => (
      <div
        key={post.id}
        className="mb-2 flex justify-between items-center bg-gray-100 p-2 hover:bg-gray-200 rounded-lg"
      >
        <Link
          to={`/post/${post.id}`}
          className="text-black text-sm hover:cursor-pointer "
        >
          {`~/ $ ${post.title}`}
        </Link>
        <span className="text-sm text-gray-500">{post.date}</span>
      </div>
    ))}
  </section>
);

const PostPage = ({ posts }: { posts: Post[] }) => {
  const postId = window.location.pathname.split("/").pop();
  const post = posts.find((p) => p.id === postId);

  if (!post) return <div>Post not found</div>;

  return (
    <article className="mb-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-medium">{post.title}</h1>
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
          home
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">{post.date}</p>
      <ReactMarkdown
        className="text-xs md:text-sm max-w-none"
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                // @ts-expect-error leave
                style={materialDark}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-medium mt-6 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-medium mt-5 mb-3" {...props} />
          ),
          p: ({ ...props }) => <p className="mb-4 text-sm" {...props} />,
          ul: ({ ...props }) => (
            <ul className="list-disc pl-5 mb-4" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-5 mb-4" {...props} />
          ),
          li: ({ ...props }) => <li className="mb-1" {...props} />,
          a: ({ ...props }) => (
            <a className="text-black hover:underline" {...props} />
          ),
        }}
      >
        {post.content}
      </ReactMarkdown>
    </article>
  );
};

const SidePanel = () => (
  <div className="hidden md:block w-64 text-sm">
    <div className="mb-8">
      <p className="text-sm text-gray-500 pb-2">Links</p>
      <ul>
        <li>
          <a
            href="https://github.com/k-xo"
            target="_blank"
            className="font-medium text-black text-xs"
          >
            [github.com/k-xo]
          </a>
        </li>
        <li>
          <a
            href="https://twitter.com/mempooIed"
            className="font-medium text-black text-xs"
            target="_blank"
          >
            [twitter.com/mempooIed]
          </a>
        </li>
        <li>
          <a
            href="mailto:alkassimk@gmail.com"
            className="font-medium text-black text-xs"
            target="_blank"
          >
            [alkassimk@gmail.com]
          </a>
        </li>
      </ul>
    </div>
  </div>
);

const App = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postFiles = import.meta.glob("../posts/*.md", { as: "raw" });
        console.log("Post files:", postFiles);

        if (Object.keys(postFiles).length === 0) {
          console.error("No Markdown files found in the posts directory");
          return;
        }

        const loadedPosts = await Promise.all(
          Object.entries(postFiles).map(async ([path, loader]) => {
            try {
              const content = await loader();

              const [, filename] = path.match(/\.\.\/posts\/(.+)\.md$/) || [];
              const [day, month, year, ...titleParts] = filename.split("-");
              return {
                id: filename,
                title: titleParts.join(" ").replace(/\.md$/, ""),
                date: `${day}/${month}/${year}`,
                content: content,
              };
            } catch (error) {
              console.error(`Error loading post from ${path}:`, error);
              return null;
            }
          })
        );

        const validPosts = loadedPosts.filter(
          (post): post is Post => post !== null
        );
        setPosts(validPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };

    loadPosts();
  }, []);

  return (
    <Router>
      <div className="container mx-auto px-4 pt-8 pb-2 max-w-full md:max-w-[900px] tracking-wider h-screen overflow-x-hidden md:overflow-visible">
        <header className="mb-8" onClick={() => (window.location.href = "/")}>
          <div className="cursor-pointer">
            <h1 className="text-xl font-medium">k-xo 🏄🏾‍♂️</h1>
            <p className="text-sm text-gray-500 pb-2">
              swe, crypto, ml & stuff
            </p>
          </div>
          <hr />
        </header>
        <div className="flex flex-wrap md:flex-nowrap md:space-x-8">
          <SidePanel />
          <main className="flex-grow max-w-full">
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <section id="home" className="mb-4 -mt-2">
                      <h2 className="text-xl font-medium">whoami</h2>
                      <p className="text-sm text-gray-500 pb-2 pt-2">
                        hi --- i'm kassim, i'm a programmer i work at{" "}
                        <a
                          href="https://0xpass.io"
                          target="_blank"
                          className="font-medium text-black"
                        >
                          [0xpass]
                        </a>{" "}
                        on distributed key management. in my free time i like
                        learning about ai/ml, & distributed systems. i like rust
                        & js/ts are goated & i am in the process of being
                        zig-pilled.
                        <br />
                        <br />
                        i'm always interested in learning new things & meeting
                        new people, so feel free to shoot me a dm or email.
                      </p>
                    </section>
                    <PostList posts={posts} />
                    <div className="mt-8">
                      <h3 className="text-xl font-medium mb-2">Spotify</h3>
                      <iframe
                        src="https://open.spotify.com/embed/playlist/5Pbca2HhQ0RovPiupV16Nb"
                        width="100%"
                        height="380"
                        allowTransparency={true}
                        allow="encrypted-media"
                        className="rounded-xl"
                      ></iframe>
                    </div>
                  </>
                }
              />
              <Route path="/post/:id" element={<PostPage posts={posts} />} />
            </Routes>
          </main>
        </div>
        <footer className="mt-8 sm:hidden block text-center">
          <a href="https://github.com/k-xo" className="mr-4" target="_blank">
            GitHub
          </a>
          <a
            href="https://twitter.com/mempooied"
            className="mr-4"
            target="_blank"
          >
            Twitter
          </a>
        </footer>
      </div>
    </Router>
  );
};

export default App;
