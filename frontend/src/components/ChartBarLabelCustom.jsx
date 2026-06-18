import React from "react";
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

const data = [
  { month: "يناير", value: 186, color: "#2dd4bf" },
  { month: "فبراير", value: 305, color: "#06b6d4" },
  { month: "مارس", value: 237, color: "#0ea5e9" },
  { month: "أبريل", value: 73, color: "#3b82f6" },
  { month: "مايو", value: 209, color: "#6366f1" },
  { month: "يونيو", value: 214, color: "#8b5cf6" },
];

const maxValue = Math.max(...data.map(d => d.value));

export function ChartBarLabelCustom() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>مخطط شريطي - التسميات المخصصة</CardTitle>
        <CardDescription>يناير - يونيو 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-80 p-4">
          <div className="space-y-4">
            {data.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              return (
                <div key={index} className="flex items-center space-x-4">
                  {/* الشهر */}
                  <div className="w-16 text-sm font-medium text-gray-700 text-right">
                    {item.month}
                  </div>

                  {/* الشريط */}
                  <div className="flex-1 relative">
                    <div className="h-8 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full flex items-center px-3 text-white text-xs font-medium rounded-md transition-all duration-500 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      >
                        {item.month}
                      </div>
                    </div>
                    {/* القيمة خارج الشريط */}
                    <span
                      className="absolute top-1/2 transform -translate-y-1/2 text-xs font-medium text-gray-700 ml-2"
                      style={{ left: `${percentage}%` }}
                    >
                      {item.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          نمو بنسبة 5.2% هذا الشهر <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-gray-600">
          عرض إجمالي الزوار للأشهر الستة الماضية
        </div>
      </CardFooter>
    </Card>
  );
}