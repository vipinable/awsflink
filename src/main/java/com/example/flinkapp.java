package com.example;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.datastream.DataStream;

public class flinkapp {
    public static void main(String[] args) throws Exception {
        // Set up the streaming execution environment
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        // Create a simple data stream with a few elements
        DataStream<String> dataStream = env.fromElements("Hello", "World", "from", "Flink");

        // Transform each element to include a greeting and print it
        dataStream.map(word -> word + ", World!").print();

        // Execute the program
        env.execute("Hello World Flink Job");
    }
}
