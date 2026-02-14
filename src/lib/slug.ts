export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

export const buildJobSlug = (title: string, hospitalName?: string | null): string => {
  const combined = [title, hospitalName].filter(Boolean).join(" ");
  const slug = slugify(combined || title);
  return slug || "job";
};

export const buildJobPath = (params: {
  id: string;
  title: string;
  hospitalName?: string | null;
}): string => `/jobs/${params.id}/${buildJobSlug(params.title, params.hospitalName)}`;

