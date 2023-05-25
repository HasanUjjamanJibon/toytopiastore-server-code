const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 3000;

// middleware configuration
app.use(cors());
app.use(express.json());

// mongodb connected here
// private repor
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.oxnofiz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 20,
});

async function run() {
  try {
    client.connect();
    const toysCollection = await client.db("ToysDB").collection("Toys");
    const indexKeys = { toyName: 1 };
    const indexOptions = { name: "toyNameTitle" };
    const result = await toysCollection.createIndex(indexKeys, indexOptions);
    // step:1 - post route create
    app.post("/all_toys", async (req, res) => {
      const newToys = req.body;

      const result = await toysCollection.insertOne(newToys);
      res.send(result);
    });

    // step:2
    app.get("/alltoys", async (req, res) => {
      const result = await toysCollection.find().limit(20).toArray();
      res.send(result);
    });

    // step :3
    app.get("/toy/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toysCollection.findOne(query);
      res.send(result);
    });
    // step :4
    app.put("/toy/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = req.body;
      const options = { upsert: true };
      const toy = {
        $set: {
          sellerName: updateDoc.sellerName,
          sellerEmail: updateDoc.sellerEmail,
          toyName: updateDoc.toyName,
          quantity: updateDoc.quantity,
          photoUrl: updateDoc.photoUrl,
          price: updateDoc.price,
          subCategory: updateDoc.subCategory,
          ratings: updateDoc.ratings,
          description: updateDoc.description,
        },
      };
      const result = await toysCollection.updateOne(query, toy, options);
      res.send(result);
    });

    // step : 5
    app.delete("/toy/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await toysCollection.deleteOne(query);
      res.send(result);
    });

    // step: 6;
    app.get("/toys", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { sellerEmail: req.query?.email };
      }
      const toys = toysCollection.find(query);
      const result = await toys.toArray();
      res.send(result);
    });

    // step:7
    app.get("/alltoys/:category", async (req, res) => {
      if (req.params.category == "All") {
        const result = await toysCollection.find().toArray();
        res.send(result);
      } else {
        const result = await toysCollection
          .find({ subCategory: req.params.category })
          .toArray();
        res.send(result);
      }
    });

    // step : 8
    app.get("/findtoy/:search", async (req, res) => {
      let searctText = req.params.search;
      const result = await toysCollection
        .find({ toyName: { $regex: searctText, $options: "i" } })
        .toArray();
      res.send(result);
    });

     // step : 9
    app.get("/toys/:select", async (req, res) => {
      const emailRef = req.query?.email;
      if (req.params.select === "Ascending") {
        const result = await toysCollection
          .aggregate([
            {
              $match: {
                sellerEmail: emailRef, // Replace with your desired email
              },
            },
            { $addFields: { convertedPrice: { $toInt: "$price" } } },
            { $sort: { convertedPrice: 1 } },
            { $project: { convertedPrice: 0 } },
          ])
          .toArray();
        res.send(result);
      } else if (req.params.select === "Descending") {
        const result = await toysCollection
          .aggregate([
            {
              $match: {
                sellerEmail: emailRef, // Replace with your desired email
              },
            },
            { $addFields: { convertedPrice: { $toInt: "$price" } } },
            { $sort: { convertedPrice: -1 } },
            { $project: { convertedPrice: 0 } },
          ])
          .toArray();
        res.send(result);
      } else {
        const result = await toysCollection
          .find({ sellerEmail: emailRef })
          .toArray();

        res.send(result);
      }
    });

     // step : 10
    app.get("/moststock", async (req, res) => {
      const result = await toysCollection
        .aggregate([
          { $addFields: { convertedQuantity: { $toInt: "$quantity" } } },
          { $sort: { convertedQuantity: -1 } },
          { $project: { convertedQuantity: 0 } },
        ])
        .limit(8)
        .toArray();
      console.log(result);
      res.send(result);
    });

     // step 11::
    app.get("/bestseller", async (req, res) => {
      const result = await toysCollection
        .aggregate([
          { $addFields: { convertedRatings: { $toInt: "$ratings" } } },
          { $sort: { convertedRatings: -1 } },
          { $project: { convertedRatings: 0 } },
        ])
        .limit(8)
        .toArray();
      console.log(result);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    console.log("finally connected to MongoDB");
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("toy shop server is running......");
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
