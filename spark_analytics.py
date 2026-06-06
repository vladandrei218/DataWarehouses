from pyspark.sql import SparkSession
from pyspark.sql.functions import avg, max, min, stddev, monotonically_increasing_id
from pyspark.ml.feature import VectorAssembler
from pyspark.ml.regression import LinearRegression

print("Initializing Apache Spark Session...")

spark = SparkSession.builder \
    .appName("AcmeFinanceSparkAnalytics") \
    .config("spark.mongodb.read.connection.uri", "mongodb://localhost:27017/acme_finance.time_series") \
    .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0") \
    .getOrCreate()

spark.sparkContext.setLogLevel("WARN")
print("Pulling Time Series data from Data Warehouse...")
df = spark.read.format("mongodb").load()

if df.isEmpty():
    print("No data found in MongoDB.")
else:
    print("\nSpark Aggregation: Asset Volatility & Volume Analysis")
    analytics_df = df.groupBy("instrumentId").agg(
        avg("closePrice").alias("Avg_Price"),
        stddev("closePrice").alias("Price_StdDev"),
        max("closePrice").alias("Highest_Price"),
        min("closePrice").alias("Lowest_Price"),
        avg("volume").alias("Avg_Daily_Volume")
    )
    analytics_df.orderBy("Avg_Daily_Volume", ascending=False).show()
    print("\nSpark MLlib: OLS Linear Regression (AAPL Trend)")
    aapl_df = df.filter(df.instrumentId == 'AAPL').orderBy("timestamp")
    
    aapl_df = aapl_df.withColumn("day_index", monotonically_increasing_id())

    assembler = VectorAssembler(inputCols=["day_index"], outputCol="features")
    ml_data = assembler.transform(aapl_df).select("features", aapl_df.closePrice.alias("label"))

    if ml_data.count() > 1:
        lr = LinearRegression(featuresCol="features", labelCol="label", predictionCol="prediction")
        lr_model = lr.fit(ml_data)
        
        print(f"Algorithm: Ordinary Least Squares (OLS) via Spark MLlib")
        print(f"Trend Slope (Coefficient): {lr_model.coefficients[0]:.4f}")
        print(f"Y-Intercept: {lr_model.intercept:.4f}")
        
        trend = "Bullish (Upward)" if lr_model.coefficients[0] > 0 else "Bearish (Downward)"
        print(f"Overall Trend Direction: {trend}")
    else:
        print("Not enough data points for ML forecasting.")

print("\nSpark Job Complete.")
spark.stop()