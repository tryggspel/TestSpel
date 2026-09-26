using System;
namespace Karlstad.Core
{
    public static class MobileInputMath
    {
        // Radial dead zone: preserves diagonals and full speed at the rim.
        public static void Stick(float x, float y, float radius, out float horizontal, out float vertical)
        {
            horizontal = vertical = 0;
            if (radius <= 0 || !Finite(x) || !Finite(y)) return;
            float length = (float)Math.Sqrt(x * x + y * y), n = Math.Min(length / radius, 1);
            if (n <= .08f) return;
            float scale = (n - .08f) / .92f / length;
            horizontal = x * scale; vertical = y * scale;
        }
        // Physical pixels normalized to the shorter screen edge; never multiply touch deltas by dt.
        public static float LookDegrees(float pixelDelta, int width, int height, float sensitivity = 1)
            => Finite(pixelDelta) ? pixelDelta / Math.Max(1, Math.Min(width, height)) * 130 * sensitivity : 0;
        public static bool Finite(float f) => !float.IsNaN(f) && !float.IsInfinity(f);
    }
}
