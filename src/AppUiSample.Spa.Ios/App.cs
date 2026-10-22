namespace AppUiSample.Spa.Ios;

// The iOS head's entry point. UIKit's Main creates the UIApplication and an AppDelegate as its
// delegate, which starts the app as launching finishes; it then runs the app's loop and never returns.
internal static class App
{
    private static void Main(string[] args)
    {
        UIApplication.Main(args, null, typeof(AppDelegate));
    }
}
