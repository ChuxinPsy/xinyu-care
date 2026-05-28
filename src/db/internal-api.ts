import { buildAppRelativePath } from '@/lib/runtime-base';

export function innerApiPath(path: string) {
  return buildAppRelativePath(path);
}
