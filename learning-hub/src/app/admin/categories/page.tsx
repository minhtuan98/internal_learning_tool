import TaxonomyClient from "@/components/TaxonomyClient";
import { prisma } from "@/lib/db";
import { deleteCategory, saveCategory } from "@/server/people-actions";

export default async function CategoriesPage() {
  const cats = await prisma.category.findMany({ include: { _count: { select: { courses: true } } }, orderBy: { name: "asc" } });
  return <TaxonomyClient kind="category" save={saveCategory} remove={deleteCategory} rows={cats.map((c) => ({ id: c.id, name: c.name, count: c._count.courses }))} />;
}
