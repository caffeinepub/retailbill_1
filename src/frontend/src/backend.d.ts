import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface LineItem {
    productName: string;
    barcode: string;
    quantity: bigint;
    unitPrice: number;
    totalPrice: number;
}
export interface Product {
    mrp: number;
    name: string;
    stock: bigint;
    barcode: string;
}
export interface Bill {
    id: string;
    createdAt: Time;
    totalAmount: number;
    items: Array<LineItem>;
}
export interface backendInterface {
    addProduct(barcode: string, name: string, mrp: number, stock: bigint): Promise<void>;
    createBill(items: Array<LineItem>): Promise<Bill>;
    deleteProduct(barcode: string): Promise<void>;
    getAllProducts(): Promise<Array<Product>>;
    getBillHistory(): Promise<Array<Bill>>;
    getProduct(barcode: string): Promise<Product>;
    loadSampleData(): Promise<void>;
    updateProduct(barcode: string, name: string, mrp: number, stock: bigint): Promise<void>;
}
