"use client";

import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Leaderboard from "@/components/Leaderboard";

import Footer from "@/components/Footer";

const Home = () => {
    return (
        <div className="min-h-screen">
            <Navigation />
            <main className="pt-20">
                <Hero />
                <div id="features">
                    <Features />
                </div>
                <div id="leaderboard">
                    <Leaderboard />
                </div>

            </main>
            <Footer />
        </div>
    );
};

export default Home;
