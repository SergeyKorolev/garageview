import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useCollection } from "@/hooks/useCollections";
import { useCollectionCars } from "@/hooks/useCollectionCars";
import { useFormatPrice } from "@/hooks/useFormatPrice";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { cn } from "@/utils/cn";

export default function FeatureMatrixPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const id = Number(collectionId);
  const { data: collection } = useCollection(id);
  const { data: carsData, isLoading } = useCollectionCars(id, 1);
  const formatPrice = useFormatPrice();

  const { sortedCars, allFeatures } = useMemo(() => {
    const cars = carsData?.cars ?? [];
    const sorted = [...cars].sort(
      (a, b) => (b.features?.length ?? 0) - (a.features?.length ?? 0)
    );
    const featureSet = new Set<string>();
    sorted.forEach((car) => car.features?.forEach((f) => featureSet.add(f)));
    return { sortedCars: sorted, allFeatures: Array.from(featureSet).sort() };
  }, [carsData]);

  if (isLoading || !collection) return <LoadingSpinner />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
        <Link
          to={`/collections/${id}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Link>
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Feature Matrix - {collection.name}
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
            <tr>
              <th className="sticky left-0 z-20 min-w-[200px] border-b border-r border-gray-200 bg-white px-3 py-2 text-left text-xs font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                Feature
              </th>
              {sortedCars.map((car) => (
                <th
                  key={car.id}
                  className="min-w-[120px] border-b border-gray-200 px-2 py-2 text-center dark:border-gray-700"
                >
                  <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">
                    {car.title}
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    {formatPrice(car.price_cents)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {car.features?.length ?? 0} features
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allFeatures.map((feature, i) => (
              <tr
                key={feature}
                className={cn(i % 2 === 0 ? "bg-gray-50 dark:bg-gray-800/50" : "")}
              >
                <td className="sticky left-0 z-10 border-r border-gray-200 bg-inherit px-3 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  <div style={{ maxWidth: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={feature}>
                    {feature}
                  </div>
                </td>
                {sortedCars.map((car) => (
                  <td
                    key={car.id}
                    className="px-2 py-1.5 text-center"
                  >
                    {car.features?.includes(feature) && (
                      <CheckIcon className="mx-auto h-4 w-4 text-green-500" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
