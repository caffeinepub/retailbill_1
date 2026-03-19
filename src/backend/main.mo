import Text "mo:core/Text";
import Float "mo:core/Float";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";

actor {
  type Product = {
    barcode : Text;
    name : Text;
    mrp : Float;
    stock : Nat;
  };

  module Product {
    public func compare(product1 : Product, product2 : Product) : Order.Order {
      switch (Text.compare(product1.name, product2.name)) {
        case (#equal) { Text.compare(product1.barcode, product2.barcode) };
        case (order) { order };
      };
    };
  };

  type LineItem = {
    barcode : Text;
    productName : Text;
    quantity : Nat;
    unitPrice : Float;
    totalPrice : Float;
  };

  type Bill = {
    id : Text;
    items : [LineItem];
    totalAmount : Float;
    createdAt : Time.Time;
  };

  let productCatalog = Map.empty<Text, Product>();
  let bills = List.empty<Bill>();

  // PRODUCT CRUD OPERATIONS

  public shared ({ caller }) func addProduct(barcode : Text, name : Text, mrp : Float, stock : Nat) : async () {
    if (productCatalog.containsKey(barcode)) { Runtime.trap("Product with this barcode already exists") };
    let product : Product = {
      barcode;
      name;
      mrp;
      stock;
    };
    productCatalog.add(barcode, product);
  };

  public shared ({ caller }) func updateProduct(barcode : Text, name : Text, mrp : Float, stock : Nat) : async () {
    switch (productCatalog.get(barcode)) {
      case (null) { Runtime.trap("Product not found") };
      case (?_) {
        let product : Product = {
          barcode;
          name;
          mrp;
          stock;
        };
        productCatalog.add(barcode, product);
      };
    };
  };

  public shared ({ caller }) func deleteProduct(barcode : Text) : async () {
    if (not productCatalog.containsKey(barcode)) {
      Runtime.trap("Product not found");
    };
    productCatalog.remove(barcode);
  };

  public query ({ caller }) func getProduct(barcode : Text) : async Product {
    switch (productCatalog.get(barcode)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func getAllProducts() : async [Product] {
    productCatalog.values().toArray().sort();
  };

  // BILL/TRANSACTION MANAGEMENT

  public shared ({ caller }) func createBill(items : [LineItem]) : async Bill {
    var totalAmount : Float = 0;
    for (item in items.values()) {
      switch (productCatalog.get(item.barcode)) {
        case (null) { Runtime.trap("Product with barcode " # item.barcode # " not found") };
        case (?product) {
          if (product.stock < item.quantity) {
            Runtime.trap("Insufficient stock for product: " # product.name);
          };
          totalAmount += item.totalPrice;
        };
      };
    };

    // Deduct stock from productCatalog (persistently)
    for (item in items.values()) {
      switch (productCatalog.get(item.barcode)) {
        case (null) { Runtime.trap("Product with barcode " # item.barcode # " not found") };
        case (?product) {
          let updatedProduct = {
            barcode = product.barcode;
            name = product.name;
            mrp = product.mrp;
            stock = product.stock - item.quantity;
          };
          productCatalog.add(item.barcode, updatedProduct);
        };
      };
    };

    let bill : Bill = {
      id = Time.now().toText();
      items;
      totalAmount;
      createdAt = Time.now();
    };

    bills.add(bill);
    bill;
  };

  public query ({ caller }) func getBillHistory() : async [Bill] {
    bills.toArray().reverse();
  };

  // SAMPLE DATA

  public shared ({ caller }) func loadSampleData() : async () {
    productCatalog.clear();
    let sampleProducts = [
      {
        barcode = "12345";
        name = "Parle-G Biscuits";
        mrp = 10.00;
        stock = 100;
      },
      {
        barcode = "23456";
        name = "Dove Soap";
        mrp = 50.00;
        stock = 50;
      },
      {
        barcode = "34567";
        name = "Tata Salt";
        mrp = 20.00;
        stock = 30;
      },
      {
        barcode = "45678";
        name = "Colgate Toothpaste";
        mrp = 60.00;
        stock = 25;
      },
      {
        barcode = "56789";
        name = "Surf Excel Detergent";
        mrp = 120.00;
        stock = 15;
      },
    ];

    for (product in sampleProducts.values()) {
      productCatalog.add(product.barcode, product);
    };
  };
};
