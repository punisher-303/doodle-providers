import { Post, ProviderContext } from "../types";
import { MovieBoxClient } from "./client";

export async function getPosts({
  filter,
  page = 1,
  providerContext,
}: {
  filter: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const client = new MovieBoxClient(providerContext.axios);
  try {
    const data = await client.getFromApi("/wefeed-h5-bff/web/home");
    const posts: Post[] = [];

    if (data.operatingList) {
      data.operatingList.forEach((op: any) => {
        if (op.banner && op.banner.items) {
          op.banner.items.forEach((item: any) => {
            posts.push({
              title: item.title,
              link: `movieboxapi://${item.detailPath}?id=${item.subjectId}&type=${item.subjectType}`,
              image: item.image?.url || "",
            });
          });
        }
        if (op.subjects) {
          op.subjects.forEach((item: any) => {
              posts.push({
               title: item.title,
               link: `movieboxapi://${item.detailPath}?id=${item.subjectId}&type=${item.subjectType}`,
               image: item.cover?.url || "",
             });
          });
        }
      });
    }
    return posts;
  } catch (error) {
    console.error("MovieBox: getPosts error", error);
    return [];
  }
}

export async function getSearchPosts({
  searchQuery,
  page = 1,
  providerContext,
}: {
  searchQuery: string;
  page: number;
  providerValue: string;
  signal: AbortSignal;
  providerContext: ProviderContext;
}): Promise<Post[]> {
  const client = new MovieBoxClient(providerContext.axios);
  try {
    const data = await client.postToApi("/wefeed-h5-bff/web/subject/search", {
      keyword: searchQuery,
      page: page,
      perPage: 24,
      subjectType: 0, // ALL
    });

    if (data.items) {
      return data.items.map((item: any) => ({
        title: item.title,
        link: `movieboxapi://${item.detailPath}?id=${item.subjectId}&type=${item.subjectType}`,
        image: item.cover?.url || "",
      }));
    }
    return [];
  } catch (error) {
    console.error("MovieBox: getSearchPosts error", error);
    return [];
  }
}
