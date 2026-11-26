// The Feed Me feed: all articles on one page (see blogFeed).
import type { APIRoute } from 'astro';
import { blogFeed } from '~/lib/api';

export const GET: APIRoute = async () => Response.json(await blogFeed());
