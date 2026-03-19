import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Bill, LineItem, Product } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetProduct(barcode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Product>({
    queryKey: ["product", barcode],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.getProduct(barcode);
    },
    enabled: !!actor && !isFetching && barcode.length > 0,
    retry: false,
  });
}

export function useGetBillHistory() {
  const { actor, isFetching } = useActor();
  return useQuery<Bill[]>({
    queryKey: ["billHistory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBillHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      barcode: string;
      name: string;
      mrp: number;
      stock: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addProduct(p.barcode, p.name, p.mrp, p.stock);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      barcode: string;
      name: string;
      mrp: number;
      stock: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateProduct(p.barcode, p.name, p.mrp, p.stock);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (barcode: string) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteProduct(barcode);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useCreateBill() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<LineItem>) => {
      if (!actor) throw new Error("No actor");
      return actor.createBill(items);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billHistory"] }),
  });
}

export function useLoadSampleData() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("No actor");
      return actor.loadSampleData();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
