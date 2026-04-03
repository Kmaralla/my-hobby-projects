import { motion, AnimatePresence } from "framer-motion";
import { Coins, Zap } from "lucide-react";

type CreditRewardProps = {
  amount: number;
  isVisible: boolean;
  isBonus?: boolean;
};

export function CreditReward({ amount, isVisible, isBonus }: CreditRewardProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg ${
            isBonus 
              ? "bg-amber-500 text-white" 
              : "bg-emerald-500 text-white"
          }`}>
            {isBonus ? (
              <Zap className="h-5 w-5" />
            ) : (
              <Coins className="h-5 w-5" />
            )}
            <span className="font-bold">+{amount}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
